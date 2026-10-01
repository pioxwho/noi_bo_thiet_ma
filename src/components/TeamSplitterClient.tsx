"use client";

import dynamic from "next/dynamic";

// Danh sách lưu trong localStorage nên chỉ render ở trình duyệt
const TeamSplitter = dynamic(() => import("@/components/TeamSplitter"), { ssr: false });

export default TeamSplitter;
