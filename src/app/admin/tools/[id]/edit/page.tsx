"use client";

import { ToolEditor } from "@/admin/components/tools/ToolEditor";
import { use } from "react";

export default function EditToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ToolEditor toolId={id} />;
}
