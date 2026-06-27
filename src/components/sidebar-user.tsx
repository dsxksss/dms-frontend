import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from '@/components/ui/badge'
import { roleTone } from '@/components/tone'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsZh } from '@/components/bilingual'
import { useAuth } from '@/auth/auth-context'
import { useUser } from '@/hooks/use-membership'

/**
 * 侧栏底部用户卡（全局 / 项目侧栏共用，保持一致）：头像 + 名字 + 邮箱 + 下拉(设置/退出)。
 * 传 role 时在右侧附一个小角色徽标（用于项目侧栏，替代原来突兀的整宽角色条）。
 */
export function SidebarUser({ role }: { role?: string | null }) {
  const { me, logout } = useAuth()
  const navigate = useNavigate()
  const isZh = useIsZh()
  const profile = useUser(me?.user_id)
  const name =
    profile.data?.display_name ||
    profile.data?.email ||
    (isZh ? '账户' : 'Account')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 text-left outline-none">
          <UserAvatar
            name={name}
            seed={me?.user_id ?? name}
            color="#2F6BFF"
            size={30}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-bold">{name}</div>
            <div className="truncate text-[10.5px] text-muted-foreground">
              {profile.data?.email ?? ''}
            </div>
          </div>
          {role && (
            <Badge variant={roleTone(role)} className="shrink-0">
              {role}
            </Badge>
          )}
          <ChevronDown className="size-[15px] shrink-0 text-[#8b95a3]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-52">
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="size-4" />
          {isZh ? '设置' : 'Settings'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => void logout()}
        >
          <LogOut className="size-4" />
          {isZh ? '退出登录' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
