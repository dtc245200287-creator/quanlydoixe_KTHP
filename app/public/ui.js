(() => {
    const TOAST_KEY = "fleet-ui-toast";

    function showToast(message, type = "success") {
        let container = document.querySelector(".toast-container");

        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `fleet-toast toast-${type}`;

        const icon = document.createElement("div");
        icon.className = "toast-icon";

        if (type === "success") icon.textContent = "✓";
        else if (type === "error") icon.textContent = "!";
        else icon.textContent = "i";

        const content = document.createElement("div");
        content.className = "toast-content";

        const title = document.createElement("strong");

        if (type === "success") title.textContent = "Thành công";
        else if (type === "error") title.textContent = "Có lỗi xảy ra";
        else title.textContent = "Thông báo";

        const text = document.createElement("span");
        text.textContent = message;

        const close = document.createElement("button");
        close.type = "button";
        close.className = "toast-close";
        close.textContent = "×";

        content.appendChild(title);
        content.appendChild(text);

        toast.appendChild(icon);
        toast.appendChild(content);
        toast.appendChild(close);

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        const removeToast = () => {
            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();

                if (!container.children.length) {
                    container.remove();
                }
            }, 250);
        };

        close.addEventListener("click", removeToast);

        setTimeout(removeToast, 8000);
    }

    window.showFleetToast = showToast;

    function saveToast(message, type = "success") {
        sessionStorage.setItem(
            TOAST_KEY,
            JSON.stringify({
                message,
                type
            })
        );
    }

    function restoreToast() {
        const saved = sessionStorage.getItem(TOAST_KEY);

        if (!saved) return;

        sessionStorage.removeItem(TOAST_KEY);

        try {
            const data = JSON.parse(saved);
            showToast(data.message, data.type);
        } catch {
            // Không làm gì nếu dữ liệu toast bị lỗi
        }
    }

    function formValue(form, name) {
        const element = form.elements.namedItem(name);

        if (!element || typeof element.value === "undefined") {
            return "";
        }

        return String(element.value).trim();
    }

    function getSuccessMessage(form, path) {
        if (path === "/vehicles/add") {
            const plate = formValue(form, "license_plate");
            return `Đã thêm xe ${plate || "mới"} thành công.`;
        }

        if (path.startsWith("/vehicles/update/")) {
            const plate = formValue(form, "license_plate");
            return `Đã lưu thay đổi xe ${plate || ""} thành công.`;
        }

        if (path.startsWith("/vehicles/delete/")) {
            return "Đã xóa xe thành công.";
        }

        if (path === "/drivers/add") {
            const name = formValue(form, "full_name");
            return `Đã thêm tài xế ${name || "mới"} thành công.`;
        }

        if (path.startsWith("/drivers/update/")) {
            const name = formValue(form, "full_name");
            return `Đã lưu thông tin tài xế ${name || ""} thành công.`;
        }

        if (path.startsWith("/drivers/delete/")) {
            return "Đã xóa tài xế thành công.";
        }

        if (path === "/maintenance/add") {
            return "Đã thêm lịch bảo dưỡng thành công.";
        }

        if (path.startsWith("/maintenance/update/")) {
            return "Đã lưu thông tin bảo dưỡng thành công.";
        }

        if (path.startsWith("/maintenance/delete/")) {
            return "Đã xóa lịch sử bảo dưỡng thành công.";
        }

        if (path === "/schedules/add") {
            const route = formValue(form, "route");
            return `Đã thêm lịch trình ${route || ""} thành công.`;
        }

        if (path.startsWith("/schedules/update/")) {
            const route = formValue(form, "route");
            return `Đã lưu lịch trình ${route || ""} thành công.`;
        }

        if (path.startsWith("/schedules/delete/")) {
            return "Đã xóa lịch trình thành công.";
        }

        if (path === "/logout") {
            return "Đăng xuất thành công. Phiên làm việc đã kết thúc.";
        }

        return "Thao tác đã được thực hiện thành công.";
    }

    function getRowLabel(form) {
        const row = form.closest("tr");

        if (!row) return "";

        const candidate =
            row.querySelector('input[name="vehicle_name"]') ||
            row.querySelector('input[name="full_name"]') ||
            row.querySelector('input[name="description"]') ||
            row.querySelector('input[name="route"]');

        return candidate ? candidate.value.trim() : "";
    }

    function getConfirmMessage(form, path) {
        const label = getRowLabel(form);

        if (path === "/logout") {
            return "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?";
        }

        if (path.startsWith("/vehicles/delete/")) {
            return label
                ? `Bạn có chắc chắn muốn xóa xe "${label}"? Dữ liệu đã xóa không thể khôi phục.`
                : "Bạn có chắc chắn muốn xóa xe này? Dữ liệu đã xóa không thể khôi phục.";
        }

        if (path.startsWith("/drivers/delete/")) {
            return label
                ? `Bạn có chắc chắn muốn xóa tài xế "${label}"?`
                : "Bạn có chắc chắn muốn xóa tài xế này?";
        }

        if (path.startsWith("/maintenance/delete/")) {
            return "Bạn có chắc chắn muốn xóa lịch sử bảo dưỡng này?";
        }

        if (path.startsWith("/schedules/delete/")) {
            return "Bạn có chắc chắn muốn xóa lịch trình này?";
        }

        return "";
    }

    function showConfirm(message, danger = false) {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "fleet-confirm-overlay";

            const modal = document.createElement("div");
            modal.className = "fleet-confirm-modal";

            const icon = document.createElement("div");
            icon.className = danger
                ? "confirm-icon danger"
                : "confirm-icon";

            icon.textContent = danger ? "!" : "?";

            const title = document.createElement("h3");
            title.textContent = danger
                ? "Xác nhận thao tác"
                : "Xác nhận";

            const text = document.createElement("p");
            text.textContent = message;

            const actions = document.createElement("div");
            actions.className = "confirm-actions";

            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.className = "confirm-cancel";
            cancel.textContent = "Hủy";

            const ok = document.createElement("button");
            ok.type = "button";
            ok.className = danger
                ? "confirm-ok danger"
                : "confirm-ok";

            ok.textContent = danger
                ? "Xác nhận"
                : "Đồng ý";

            actions.appendChild(cancel);
            actions.appendChild(ok);

            modal.appendChild(icon);
            modal.appendChild(title);
            modal.appendChild(text);
            modal.appendChild(actions);

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.classList.add("show");
            });

            const finish = (value) => {
                overlay.classList.remove("show");

                setTimeout(() => {
                    overlay.remove();
                    resolve(value);
                }, 180);
            };

            cancel.addEventListener("click", () => finish(false));
            ok.addEventListener("click", () => finish(true));

            overlay.addEventListener("click", (event) => {
                if (event.target === overlay) {
                    finish(false);
                }
            });
        });
    }

    function validateBusinessForm(form, path) {
        if (path.startsWith("/schedules/")) {
            const start = formValue(form, "start_time");
            const end = formValue(form, "end_time");

            if (
                start &&
                end &&
                new Date(end).getTime() <= new Date(start).getTime()
            ) {
                showToast(
                    "Thời gian kết thúc phải sau thời gian bắt đầu.",
                    "error"
                );

                return false;
            }
        }

        if (path.startsWith("/vehicles/")) {
            const yearText = formValue(
                form,
                "manufacture_year"
            );

            if (yearText) {
                const year = Number(yearText);
                const maxYear =
                    new Date().getFullYear() + 1;

                if (year < 1900 || year > maxYear) {
                    showToast(
                        `Năm sản xuất phải nằm trong khoảng 1900 - ${maxYear}.`,
                        "error"
                    );

                    return false;
                }
            }
        }

        return true;
    }

    function cleanErrorMessage(raw) {
        const temp = document.createElement("div");
        temp.innerHTML = raw;

        const text =
            temp.textContent ||
            temp.innerText ||
            "";

        return text
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 220);
    }

    function setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.dataset.originalText =
                button.textContent;

            button.disabled = true;
            button.classList.add("is-loading");
            button.textContent = "Đang xử lý...";
        } else {
            button.disabled = false;
            button.classList.remove("is-loading");

            if (button.dataset.originalText) {
                button.textContent =
                    button.dataset.originalText;
            }
        }
    }

    function setupActiveNavigation() {
        const currentPath =
            window.location.pathname === "/"
                ? "/"
                : window.location.pathname.replace(/\/$/, "");

        document
            .querySelectorAll(".nav-links a")
            .forEach((link) => {
                const href =
                    new URL(link.href).pathname.replace(/\/$/, "") || "/";

                const active =
                    href === "/"
                        ? currentPath === "/"
                        : currentPath.startsWith(href);

                link.classList.toggle(
                    "active",
                    active
                );
            });
    }

    function paintStatus(select) {
        select.classList.remove(
            "status-ready",
            "status-active",
            "status-maintenance"
        );

        if (select.value === "Sẵn sàng") {
            select.classList.add("status-ready");
        }

        if (select.value === "Đang hoạt động") {
            select.classList.add("status-active");
        }

        if (select.value === "Bảo dưỡng") {
            select.classList.add(
                "status-maintenance"
            );
        }
    }

    function setupVehicleStatus() {
        document
            .querySelectorAll('select[name="status"]')
            .forEach((select) => {
                paintStatus(select);

                select.addEventListener(
                    "change",
                    () => paintStatus(select)
                );
            });
    }

    document.addEventListener(
        "submit",
        async (event) => {
            const form = event.target;

            if (!(form instanceof HTMLFormElement)) {
                return;
            }

            if (
                form.method.toLowerCase() !== "post"
            ) {
                return;
            }

            const path =
                new URL(
                    form.action,
                    window.location.origin
                ).pathname;

            /*
             * Giữ nguyên cơ chế đăng nhập hiện tại
             * để thông báo sai mật khẩu của server vẫn hoạt động.
             */
            if (path === "/login") {
                return;
            }

            event.preventDefault();

            if (!form.reportValidity()) {
                return;
            }

            if (!validateBusinessForm(form, path)) {
                return;
            }

            const isDelete =
                path.includes("/delete/");

            const isLogout =
                path === "/logout";

            if (isDelete || isLogout) {
                const confirmMessage =
                    getConfirmMessage(form, path);

                const accepted =
                    await showConfirm(
                        confirmMessage,
                        true
                    );

                if (!accepted) {
                    return;
                }
            }

            const submitButton =
                event.submitter ||
                form.querySelector(
                    'button[type="submit"]'
                );

            setButtonLoading(
                submitButton,
                true
            );

            try {
                const formData =
                    new FormData(form);

                const body =
                    new URLSearchParams();

                for (
                    const [key, value]
                    of formData.entries()
                ) {
                    body.append(
                        key,
                        String(value)
                    );
                }

                const response =
                    await fetch(form.action, {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded;charset=UTF-8",
                            "X-Requested-With":
                                "XMLHttpRequest"
                        },
                        body,
                        credentials: "same-origin",
                        redirect: "follow"
                    });

                if (!response.ok) {
                    const raw =
                        await response.text();

                    const message =
                        cleanErrorMessage(raw) ||
                        "Không thể thực hiện thao tác.";

                    showToast(
                        message,
                        "error"
                    );

                    setButtonLoading(
                        submitButton,
                        false
                    );

                    return;
                }

                saveToast(
                    getSuccessMessage(
                        form,
                        path
                    ),
                    "success"
                );

                window.location.href =
                    response.url ||
                    window.location.href;

            } catch (error) {
                console.error(error);

                showToast(
                    "Không thể kết nối tới hệ thống. Vui lòng thử lại.",
                    "error"
                );

                setButtonLoading(
                    submitButton,
                    false
                );
            }
        }
    );

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            restoreToast();
            setupActiveNavigation();
            setupVehicleStatus();
        }
    );
})();
