const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();


/* =====================================================
   KẾT NỐI POSTGRESQL
===================================================== */

const pool = new Pool({
    host: process.env.DB_HOST || "postgres",
    port: 5432,
    user: process.env.DB_USER || "fleetuser",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "fleetdb"
});

/* =====================================================
   NHẬT KÝ NGHIỆP VỤ / AUDIT LOG
===================================================== */

async function initializeAuditLogs() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50),
            entity_id INTEGER,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function writeAudit(
    username,
    action,
    entityType = null,
    entityId = null,
    details = null
) {
    try {
        await pool.query(
            `
            INSERT INTO audit_logs (
                username,
                action,
                entity_type,
                entity_id,
                details
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                username || "system",
                action,
                entityType,
                entityId,
                details
            ]
        );
    } catch (error) {
        console.error("AUDIT LOG ERROR:", error);
    }
}


/* =====================================================
   CẤU HÌNH EXPRESS
===================================================== */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


/* =====================================================
   SESSION
===================================================== */

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 8 * 60 * 60 * 1000
        }
    })
);


/* =====================================================
   BIẾN NGƯỜI DÙNG CHO GIAO DIỆN
===================================================== */

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});


/* =====================================================
   KHỞI TẠO TÀI KHOẢN ADMIN
===================================================== */

async function initializeAdmin() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password || !process.env.SESSION_SECRET) {
        throw new Error(
            "Thiếu ADMIN_USERNAME, ADMIN_PASSWORD hoặc SESSION_SECRET"
        );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
        `
        INSERT INTO users (
            username,
            password_hash
        )
        VALUES ($1, $2)

        ON CONFLICT (username)
        DO UPDATE SET
            password_hash = EXCLUDED.password_hash
        `,
        [
            username,
            passwordHash
        ]
    );
}


/* =====================================================
   ĐĂNG NHẬP
===================================================== */

app.get("/login", (req, res) => {

    if (req.session.user) {
        return res.redirect("/");
    }

    res.render("login", {
        error: null
    });
});


app.post("/login", async (req, res) => {

const username = (req.body.username || "").trim();
const password = req.body.password || "";


    try {

        const result = await pool.query(
            `
            SELECT *
            FROM users
            WHERE username = $1
            `,
            [username]
        );

        if (result.rows.length === 0) {

            return res.status(401).render(
                "login",
                {
                    error:
                        "Tên đăng nhập hoặc mật khẩu không đúng."
                }
            );
        }

        const user = result.rows[0];

        const passwordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordCorrect) {

            return res.status(401).render(
                "login",
                {
                    error:
                        "Tên đăng nhập hoặc mật khẩu không đúng."
                }
            );
        }

        req.session.user = {
            id: user.id,
            username: user.username
        };

await writeAudit(
    user.username,
    "LOGIN",
    "auth",
    user.id,
    "Đăng nhập hệ thống thành công"
    );

        res.redirect("/");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Có lỗi khi đăng nhập."
        );
    }
});


/* =====================================================
   ĐĂNG XUẤT
===================================================== */

app.post("/logout", async (req, res) => {

    const username =
        req.session.user?.username || "unknown";

    const userId =
        req.session.user?.id || null;

    await writeAudit(
        username,
        "LOGOUT",
        "auth",
        userId,
        "Đăng xuất khỏi hệ thống"
    );

    req.session.destroy((error) => {

        if (error) {
            console.error(error);

            return res.status(500).send(
                "Không thể đăng xuất."
            );
        }

        res.clearCookie("connect.sid");

        res.redirect("/login");
    });
});


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/health", (req, res) => {

    res.json({
        status: "OK",
        service: "Fleet Management"
    });
});


/* =====================================================
   MIDDLEWARE KIỂM TRA ĐĂNG NHẬP
===================================================== */

function requireLogin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    next();
}


/*
    Từ đây trở xuống phải đăng nhập
*/

app.use(requireLogin);


/* =====================================================
   TRANG CHỦ
===================================================== */

app.get("/", async (req, res) => {

    try {

        const vehicles = await pool.query(
            "SELECT COUNT(*) FROM vehicles"
        );

        const drivers = await pool.query(
            "SELECT COUNT(*) FROM drivers"
        );

        const maintenance = await pool.query(
            "SELECT COUNT(*) FROM maintenance"
        );

        const schedules = await pool.query(
            "SELECT COUNT(*) FROM schedules"
        );

        res.render("index", {

            vehicleCount:
                vehicles.rows[0].count,

            driverCount:
                drivers.rows[0].count,

            maintenanceCount:
                maintenance.rows[0].count,

            scheduleCount:
                schedules.rows[0].count
        });

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể kết nối cơ sở dữ liệu."
        );
    }
});


/* =====================================================
   QUẢN LÝ XE
===================================================== */

app.get("/vehicles", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT * FROM vehicles ORDER BY id DESC"
        );

        res.render(
            "vehicles",
            {
                vehicles: result.rows
            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Lỗi tải danh sách xe."
        );
    }
});


app.post("/vehicles/add", async (req, res) => {

    const {
        license_plate,
        vehicle_name,
        brand,
        manufacture_year,
        status
    } = req.body;

    try {

        const result = await pool.query(
    `
    INSERT INTO vehicles (
        license_plate,
        vehicle_name,
        brand,
        manufacture_year,
        status
    )
    VALUES ($1,$2,$3,$4,$5)

    RETURNING id
    `,
    [
        license_plate,
        vehicle_name,
        brand,
        manufacture_year || null,
        status
    ]
);

await writeAudit(
    req.session.user.username,
    "CREATE_VEHICLE",
    "vehicle",
    result.rows[0].id,
    `Thêm xe ${license_plate} - ${vehicle_name}`
);

res.redirect("/vehicles");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể thêm xe."
        );
    }
});


app.post("/vehicles/update/:id", async (req, res) => {

    const {
        license_plate,
        vehicle_name,
        brand,
        manufacture_year,
        status
    } = req.body;

    try {

        await pool.query(
            `
            UPDATE vehicles
            SET
                license_plate = $1,
                vehicle_name = $2,
                brand = $3,
                manufacture_year = $4,
                status = $5
            WHERE id = $6
            `,
            [
                license_plate,
                vehicle_name,
                brand,
                manufacture_year || null,
                status,
                req.params.id
            ]
        );

await writeAudit(
    req.session.user.username,
    "UPDATE_VEHICLE",
    "vehicle",
    Number(req.params.id),
    `Cập nhật xe ${license_plate} - ${vehicle_name}, trạng thái ${status}`
);

        res.redirect("/vehicles");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể cập nhật xe."
        );
    }
});


app.post("/vehicles/delete/:id", async (req, res) => {

    try {

        const deleted = await pool.query(
    `
    DELETE FROM vehicles
    WHERE id = $1
    RETURNING license_plate, vehicle_name
    `,
    [req.params.id]
);

if (deleted.rows.length > 0) {
    await writeAudit(
        req.session.user.username,
        "DELETE_VEHICLE",
        "vehicle",
        Number(req.params.id),
        `Xóa xe ${deleted.rows[0].license_plate} - ${deleted.rows[0].vehicle_name}`
    );
}


        res.redirect("/vehicles");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể xóa xe."
        );
    }
});


/* =====================================================
   QUẢN LÝ TÀI XẾ
===================================================== */

app.get("/drivers", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT * FROM drivers ORDER BY id DESC"
        );

        res.render(
            "drivers",
            {
                drivers: result.rows
            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Lỗi tải danh sách tài xế."
        );
    }
});


app.post("/drivers/add", async (req, res) => {

    const {
        full_name,
        license_number,
        phone
    } = req.body;

    try {

       const result = await pool.query(
    `
    INSERT INTO drivers (
        full_name,
        license_number,
        phone
    )
    VALUES ($1,$2,$3)
    RETURNING id
    `,
    [
        full_name,
        license_number,
        phone
    ]
);

await writeAudit(
    req.session.user.username,
    "CREATE_DRIVER",
    "driver",
    result.rows[0].id,
    `Thêm tài xế ${full_name} - GPLX ${license_number}`
);

res.redirect("/drivers");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể thêm tài xế."
        );
    }
});


app.post("/drivers/update/:id", async (req, res) => {

    const {
        full_name,
        license_number,
        phone
    } = req.body;

    try {

        await pool.query(
            `
            UPDATE drivers
            SET
                full_name = $1,
                license_number = $2,
                phone = $3
            WHERE id = $4
            `,
            [
                full_name,
                license_number,
                phone,
                req.params.id
            ]
        );

await writeAudit(
    req.session.user.username,
    "UPDATE_DRIVER",
    "driver",
    Number(req.params.id),
    `Cập nhật tài xế ${full_name} - GPLX ${license_number}`
);
        res.redirect("/drivers");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể cập nhật tài xế."
        );
    }
});


app.post("/drivers/delete/:id", async (req, res) => {

    try {

        const deleted = await pool.query(
    `
    DELETE FROM drivers
    WHERE id = $1
    RETURNING full_name, license_number
    `,
    [req.params.id]
);

if (deleted.rows.length > 0) {
    await writeAudit(
        req.session.user.username,
        "DELETE_DRIVER",
        "driver",
        Number(req.params.id),
        `Xóa tài xế ${deleted.rows[0].full_name} - GPLX ${deleted.rows[0].license_number}`
    );
}

        res.redirect("/drivers");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể xóa tài xế."
        );
    }
});


/* =====================================================
   QUẢN LÝ BẢO DƯỠNG
===================================================== */

app.get("/maintenance", async (req, res) => {

    try {

        const vehicles = await pool.query(
            "SELECT * FROM vehicles ORDER BY id"
        );

        const records = await pool.query(
            `
            SELECT
                maintenance.*,
                vehicles.license_plate,
                vehicles.vehicle_name
            FROM maintenance
            JOIN vehicles
                ON maintenance.vehicle_id = vehicles.id
            ORDER BY maintenance.id DESC
            `
        );

        res.render(
            "maintenance",
            {
                vehicles: vehicles.rows,
                records: records.rows
            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Lỗi tải thông tin bảo dưỡng."
        );
    }
});


app.post("/maintenance/add", async (req, res) => {

    const {
        vehicle_id,
        maintenance_date,
        description,
        cost
    } = req.body;

    try {

       const result = await pool.query(
    `
    INSERT INTO maintenance (
        vehicle_id,
        maintenance_date,
        description,
        cost
    )
    VALUES ($1,$2,$3,$4)
    RETURNING id
    `,
    [
        vehicle_id,
        maintenance_date,
        description,
        cost || 0
    ]
);

await writeAudit(
    req.session.user.username,
    "CREATE_MAINTENANCE",
    "maintenance",
    result.rows[0].id,
    `Thêm bảo dưỡng xe ID ${vehicle_id}: ${description}, chi phí ${cost || 0}`
);

res.redirect("/maintenance");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể thêm bảo dưỡng."
        );
    }
});


app.post(
    "/maintenance/update/:id",
    async (req, res) => {

        const {
            vehicle_id,
            maintenance_date,
            description,
            cost
        } = req.body;

        try {

            await pool.query(
                `
                UPDATE maintenance
                SET
                    vehicle_id = $1,
                    maintenance_date = $2,
                    description = $3,
                    cost = $4
                WHERE id = $5
                `,
                [
                    vehicle_id,
                    maintenance_date,
                    description,
                    cost || 0,
                    req.params.id
                ]
            );

await writeAudit(
    req.session.user.username,
    "UPDATE_MAINTENANCE",
    "maintenance",
    Number(req.params.id),
    `Cập nhật bảo dưỡng xe ID ${vehicle_id}: ${description}, chi phí ${cost || 0}`
);
            res.redirect("/maintenance");

        } catch (error) {

            console.error(error);

            res.status(500).send(
                "Không thể cập nhật bảo dưỡng."
            );
        }
    }
);


app.post(
    "/maintenance/delete/:id",
    async (req, res) => {

        try {

            const deleted = await pool.query(
    `
    DELETE FROM maintenance
    WHERE id = $1
    RETURNING vehicle_id, description, cost
    `,
    [req.params.id]
);

if (deleted.rows.length > 0) {
    await writeAudit(
        req.session.user.username,
        "DELETE_MAINTENANCE",
        "maintenance",
        Number(req.params.id),
        `Xóa bảo dưỡng xe ID ${deleted.rows[0].vehicle_id}: ${deleted.rows[0].description}`
    );
}

            res.redirect("/maintenance");

        } catch (error) {

            console.error(error);

            res.status(500).send(
                "Không thể xóa bảo dưỡng."
            );
        }
    }
);


/* =====================================================
   QUẢN LÝ LỊCH TRÌNH
===================================================== */

app.get("/schedules", async (req, res) => {

    try {

        const vehicles = await pool.query(
            "SELECT * FROM vehicles ORDER BY id"
        );

        const drivers = await pool.query(
            "SELECT * FROM drivers ORDER BY id"
        );

        const schedules = await pool.query(
            `
            SELECT
                schedules.*,
                vehicles.license_plate,
                vehicles.vehicle_name,
                drivers.full_name
            FROM schedules

            JOIN vehicles
                ON schedules.vehicle_id = vehicles.id

            JOIN drivers
                ON schedules.driver_id = drivers.id

            ORDER BY schedules.id DESC
            `
        );

        res.render(
            "schedules",
            {
                vehicles: vehicles.rows,
                drivers: drivers.rows,
                schedules: schedules.rows
            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Lỗi tải lịch trình."
        );
    }
});


app.post("/schedules/add", async (req, res) => {

    const {
        vehicle_id,
        driver_id,
        route,
        start_time,
        end_time
    } = req.body;

    try {

        const result = await pool.query(
    `
    INSERT INTO schedules (
        vehicle_id,
        driver_id,
        route,
        start_time,
        end_time
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING id
    `,
    [
        vehicle_id,
        driver_id,
        route,
        start_time,
        end_time || null
    ]
);

await writeAudit(
    req.session.user.username,
    "CREATE_SCHEDULE",
    "schedule",
    result.rows[0].id,
    `Thêm lịch trình ${route} - xe ID ${vehicle_id} - tài xế ID ${driver_id}`
);

res.redirect("/schedules");

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Không thể thêm lịch trình."
        );
    }
});


app.post(
    "/schedules/update/:id",
    async (req, res) => {

        const {
            vehicle_id,
            driver_id,
            route,
            start_time,
            end_time
        } = req.body;

        try {

            await pool.query(
                `
                UPDATE schedules
                SET
                    vehicle_id = $1,
                    driver_id = $2,
                    route = $3,
                    start_time = $4,
                    end_time = $5
                WHERE id = $6
                `,
                [
                    vehicle_id,
                    driver_id,
                    route,
                    start_time,
                    end_time || null,
                    req.params.id
                ]
            );

await writeAudit(
    req.session.user.username,
    "UPDATE_SCHEDULE",
    "schedule",
    Number(req.params.id),
    `Cập nhật lịch trình ${route} - xe ID ${vehicle_id} - tài xế ID ${driver_id}`
);

            res.redirect("/schedules");

        } catch (error) {

            console.error(error);

            res.status(500).send(
                "Không thể cập nhật lịch trình."
            );
        }
    }
);


app.post(
    "/schedules/delete/:id",
    async (req, res) => {

        try {

           const deleted = await pool.query(
    `
    DELETE FROM schedules
    WHERE id = $1
    RETURNING route, vehicle_id, driver_id
    `,
    [req.params.id]
);

if (deleted.rows.length > 0) {
    await writeAudit(
        req.session.user.username,
        "DELETE_SCHEDULE",
        "schedule",
        Number(req.params.id),
        `Xóa lịch trình ${deleted.rows[0].route}`
    );
}

            res.redirect("/schedules");

        } catch (error) {

            console.error(error);

            res.status(500).send(
                "Không thể xóa lịch trình."
            );
        }
    }
);


/* =====================================================
   KHỞI ĐỘNG SERVER
===================================================== */

const PORT = process.env.PORT || 3000;


async function startServer() {

    try {

        await initializeAdmin();
        await initializeAuditLogs();
        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `Fleet Management đang chạy tại cổng ${PORT}`
                );
            }
        );

    } catch (error) {

        console.error(
            "Không thể khởi động hệ thống:",
            error
        );

        process.exit(1);
    }
}


startServer();
