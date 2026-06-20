"use client";

import { useEffect, useMemo, useState } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import {
  DEMO_NOTIFICATIONS,
  NOTIFICATION_META,
  type VendorNotification,
  type VendorNotificationCategory
} from "@/lib/vendor/demo-data";

type IconName = Parameters<typeof VendorIcon>[0]["name"];

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (diff === 0) {
    return `Hoje · ${hora}`;
  }

  if (diff === 1) {
    return `Ontem · ${hora}`;
  }

  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${hora}`;
}

export function NotificationsScreen({
  initialNotifications = DEMO_NOTIFICATIONS
}: {
  initialNotifications?: VendorNotification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.lida).length,
    [notifications]
  );

  useEffect(() => {
    // clear dashboard badge when notifications page is opened
    window.localStorage.setItem("venumais-notif-seen", "1");
  }, []);

  const markAllRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, lida: true })));
    window.localStorage.setItem("venumais-notif-seen", "1");
  };

  return (
    <>
      <VendorScreenHeader
        action={
          unreadCount ? (
            <button className="vendor-notifications-mark-read" onClick={markAllRead} type="button">
              Marcar lidas
            </button>
          ) : undefined
        }
        backHref="/painel"
        subtitle={unreadCount ? `${unreadCount} não lidas` : "Tudo em dia"}
        title="Notificações"
      />

      <section className="vendor-screen-body vendor-notifications">
        {notifications.map((notification) => {
          const meta = NOTIFICATION_META[notification.cat as VendorNotificationCategory];

          return (
            <div
              className={`vendor-notification-item ${notification.lida ? "" : "vendor-notification-item-unread"}`.trim()}
              key={notification.id}
            >
              <span
                className="vendor-notification-icon"
                style={{ background: meta.bg, color: meta.cor }}
              >
                <VendorIcon name={meta.icon as IconName} size={20} />
              </span>
              <div className="vendor-notification-copy">
                <div className="vendor-notification-title">
                  <strong>{notification.titulo}</strong>
                  {!notification.lida ? <span aria-hidden="true" className="vendor-notification-dot" /> : null}
                </div>
                <p>{notification.texto}</p>
                <small>{formatNotificationTime(notification.em)}</small>
              </div>
            </div>
          );
        })}

        {!notifications.length ? (
          <div className="vendor-empty">
            <p>Nenhuma notificação ainda.</p>
          </div>
        ) : null}

        <div className="vendor-dashboard-spacer" />
      </section>
    </>
  );
}
