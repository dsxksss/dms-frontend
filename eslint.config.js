import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // HMR 便利性约束（导出组件同时导出辅助函数）——非正确性问题，降级为提示。
      'react-refresh/only-export-components': 'warn',
      // 弹窗"打开时重置表单"的有意 setState 模式——非 bug，降级为提示。
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // 测试与配置文件放宽 fast-refresh 约束。
    files: ['**/*.test.{ts,tsx}', 'src/test/**', '*.config.ts'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
