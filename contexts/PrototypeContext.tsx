import React, { createContext, useContext, useMemo, useState } from "react";
import { attendanceRows, approvals as approvalSeed, notifications as notificationSeed, requests as requestSeed } from "../constants/mockData";

type AttendanceState = "belum" | "masuk" | "selesai";
type RequestStatus = "Disetujui" | "Menunggu" | "Ditolak";
type Decision = "Disetujui" | "Ditolak";

export interface RequestItem {
  id: string;
  title: string;
  meta: string;
  days: string;
  status: RequestStatus;
  type: string;
}

export interface ApprovalItem {
  id: string;
  name: string;
  unit: string;
  type: string;
  range: string;
  reason: string;
  info: string;
}

export interface ApprovalHistoryItem extends ApprovalItem {
  decision: Decision;
}

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

interface PrototypeContextValue {
  attendanceState: AttendanceState;
  jamMasuk: string | null;
  jamPulang: string | null;
  workDuration: string;
  attendanceHistory: typeof attendanceRows;
  requests: RequestItem[];
  approvals: ApprovalItem[];
  approvalHistory: ApprovalHistoryItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  toast: string | null;
  submitAttendance: (type: "masuk" | "pulang") => void;
  submitRequest: (payload: Pick<RequestItem, "title" | "meta" | "days" | "type">) => void;
  decideApproval: (id: string, decision: Decision) => void;
  markNotificationRead: (id: string) => void;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function flash(setToast: (message: string | null) => void, message: string) {
  setToast(message);
  setTimeout(() => setToast(null), 2200);
}

export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [attendanceState, setAttendanceState] = useState<AttendanceState>("belum");
  const [jamMasuk, setJamMasuk] = useState<string | null>(null);
  const [jamPulang, setJamPulang] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>(
    requestSeed.map((item, index) => ({ id: `req-${index + 1}`, ...item, status: item.status as RequestStatus }))
  );
  const [approvals, setApprovals] = useState<ApprovalItem[]>(
    approvalSeed.map((item, index) => ({ id: `approval-${index + 1}`, ...item }))
  );
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    notificationSeed.map((item, index) => ({ id: `notif-${index + 1}`, ...item }))
  );
  const [toast, setToast] = useState<string | null>(null);

  const value = useMemo<PrototypeContextValue>(() => {
    const unreadCount = notifications.filter((item) => item.unread).length;
    const workDuration = attendanceState === "belum" ? "0j 0m" : attendanceState === "masuk" ? "4j 18m" : "8j 10m";

    return {
      attendanceState,
      jamMasuk,
      jamPulang,
      workDuration,
      attendanceHistory: attendanceRows,
      requests,
      approvals,
      approvalHistory,
      notifications,
      unreadCount,
      toast,
      submitAttendance(type) {
        const time = nowTime();
        if (type === "masuk") {
          setJamMasuk(time);
          setAttendanceState("masuk");
          flash(setToast, `Presensi masuk tercatat ${time}`);
          return;
        }

        setJamPulang(time);
        setAttendanceState("selesai");
        flash(setToast, `Presensi pulang tercatat ${time}`);
      },
      submitRequest(payload) {
        const nextRequest: RequestItem = {
          id: `req-${Date.now()}`,
          ...payload,
          status: "Menunggu",
        };
        setRequests((current) => [nextRequest, ...current]);
        setNotifications((current) => [
          {
            id: `notif-${Date.now()}`,
            title: "Pengajuan berhasil dikirim",
            desc: `${payload.title} menunggu persetujuan atasan`,
            time: "Baru saja",
            unread: true,
          },
          ...current,
        ]);
        flash(setToast, "Pengajuan terkirim");
      },
      decideApproval(id, decision) {
        setApprovals((current) => {
          const selected = current.find((item) => item.id === id);
          if (!selected) return current;
          setApprovalHistory((history) => [{ ...selected, decision }, ...history]);
          setNotifications((items) => [
            {
              id: `notif-${Date.now()}`,
              title: `Pengajuan ${selected.name} ${decision.toLowerCase()}`,
              desc: `${selected.type} - ${selected.range}`,
              time: "Baru saja",
              unread: true,
            },
            ...items,
          ]);
          flash(setToast, decision === "Disetujui" ? "Pengajuan disetujui" : "Pengajuan ditolak");
          return current.filter((item) => item.id !== id);
        });
      },
      markNotificationRead(id) {
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, unread: false } : item))
        );
      },
    };
  }, [approvalHistory, approvals, attendanceState, jamMasuk, jamPulang, notifications, requests, toast]);

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) {
    throw new Error("usePrototype must be used inside PrototypeProvider");
  }
  return context;
}
