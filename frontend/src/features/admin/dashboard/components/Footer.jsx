// Footer mảnh cho khu vực quản trị.
export default function Footer() {
    return (
        <footer className="admin-footer">
            <span>© {new Date().getFullYear()} Vietravel — Hệ thống quản trị nội bộ</span>
            <span>Phiên bản 1.0</span>
        </footer>
    );
}
