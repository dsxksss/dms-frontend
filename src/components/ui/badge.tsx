import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-[3px] text-[11.5px] leading-none font-semibold whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-muted text-muted-foreground [a&]:hover:bg-muted/80",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        /* —— 状态 / 角色 tone：来自 design_handoff 冻结的 hex 配对 —— */
        success: "bg-[#E7F6EC] text-[#15803D]", // 已验证 / 已完成 / Contributor
        warning: "bg-[#FEF4E6] text-[#B45309]", // 合成中 / 更新
        info: "bg-[#EAF0FF] text-[#2F6BFF]", // 进行中 / Manager / id
        danger: "bg-[#FDECEC] text-[#B91C1C]", // 失败 / 已终止 / 删除
        neutral: "bg-[#EEF0F3] text-[#64748B]", // 待测 / 草稿 / Viewer / ignore
        purple: "bg-[#EFE9FB] text-[#6D5BD0]", // Owner / 平台
        pink: "bg-[#FBEAF2] text-[#BE185D]", // label（列角色）
        lock: "bg-[#FFF3F0] text-[#E0492C]", // 保密 / 锁定
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
