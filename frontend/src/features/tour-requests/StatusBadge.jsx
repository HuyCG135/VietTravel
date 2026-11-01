import { getStatusMeta } from "./tourRequestUtils";

export default function StatusBadge({ status, className = "" }) {
    const meta = getStatusMeta(status);

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badge} ${className}`}
        >
            <i className={meta.icon} aria-hidden="true" />
            {meta.label}
        </span>
    );
}
