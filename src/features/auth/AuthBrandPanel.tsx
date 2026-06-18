import { useTranslation } from 'react-i18next'

/** 登录 / 注册左侧品牌面板（渐变 + 标语 + 能力胶囊）。窄屏隐藏。 */
export function AuthBrandPanel() {
  const { t } = useTranslation('auth')
  const pills = ['schema', 'perms', 'lineage', 'rls'] as const
  return (
    <div
      className="relative hidden flex-1 flex-col justify-between overflow-hidden px-[52px] py-[46px] text-white md:flex"
      style={{
        background:
          'linear-gradient(150deg,#2F6BFF 0%,#5B3FE0 55%,#7C3AED 100%)',
      }}
    >
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex size-[34px] items-center justify-center rounded-[9px] bg-white/[0.16]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M9 3h6M9 3v5l-4.5 8A2.5 2.5 0 0 0 6.8 20h10.4a2.5 2.5 0 0 0 2.3-3.6L15 8V3" />
            <path d="M7.5 14h9" />
          </svg>
        </div>
        <div className="text-[18px] font-extrabold">Bio-Data OS</div>
      </div>

      <div className="relative z-10 max-w-[440px]">
        <div className="text-[34px] font-extrabold leading-[1.25] tracking-[-0.01em]">
          {t('login.brandHeadline')}
        </div>
        <div className="mt-[18px] text-[15px] leading-[1.7] opacity-[0.86]">
          {t('login.brandSubtitle')}
        </div>
        <div className="mt-[26px] flex flex-wrap gap-[9px]">
          {pills.map((p) => (
            <span
              key={p}
              className="rounded-full bg-white/[0.14] px-3 py-1.5 text-[12px] font-semibold"
            >
              {t(`login.pills.${p}`)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-[12.5px] opacity-70">
        {t('login.brandFootnote')}
      </div>

      <div className="absolute -right-[90px] -bottom-[90px] size-[320px] rounded-full bg-white/[0.07]" />
      <div className="absolute top-[90px] right-[60px] size-[160px] rounded-full bg-white/[0.05]" />
    </div>
  )
}
