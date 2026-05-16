import { OrderEvent, OrderStatus } from "@/utils/orders";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; emoji: string; colorClass: string; dotClass: string }
> = {
  pending: {
    label: "Pendiente",
    emoji: "⏳",
    colorClass: "text-gray-600 dark:text-gray-400",
    dotClass: "bg-gray-400",
  },
  paid: {
    label: "Pagado",
    emoji: "💰",
    colorClass: "text-blue-600 dark:text-blue-400",
    dotClass: "bg-blue-500",
  },
  processing: {
    label: "En proceso",
    emoji: "⚙️",
    colorClass: "text-orange-600 dark:text-orange-400",
    dotClass: "bg-orange-500",
  },
  shipped: {
    label: "Enviado",
    emoji: "📦",
    colorClass: "text-yellow-600 dark:text-yellow-400",
    dotClass: "bg-yellow-500",
  },
  completed: {
    label: "Completado",
    emoji: "✅",
    colorClass: "text-green-600 dark:text-green-400",
    dotClass: "bg-green-500",
  },
  disputed: {
    label: "En disputa",
    emoji: "⚠️",
    colorClass: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500",
  },
  refunded: {
    label: "Reembolsado",
    emoji: "🔄",
    colorClass: "text-purple-600 dark:text-purple-400",
    dotClass: "bg-purple-500",
  },
};

function formatTs(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export default function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-light-text py-4 text-center text-sm opacity-60 dark:text-gray-400">
        No hay eventos registrados para esta orden.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 dark:border-gray-700">
      {events.map((event, i) => {
        const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.pending;
        return (
          <li key={event.id ?? i} className="mb-6 ml-4">
            <div
              className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white dark:border-gray-900 ${cfg.dotClass}`}
            />
            <div className="flex items-center gap-2">
              <span className="text-base">{cfg.emoji}</span>
              <span className={`text-sm font-semibold ${cfg.colorClass}`}>
                {cfg.label}
              </span>
              <time className="text-xs text-gray-500 dark:text-gray-400">
                {formatTs(event.timestamp)}
              </time>
            </div>
            {event.message && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {event.message}
              </p>
            )}
            {event.status === "shipped" && event.trackingNumber && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Tracking:{" "}
                <span className="font-mono font-medium">
                  {event.trackingNumber}
                </span>
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
