<!-- app/app.vue -->
<script setup lang="ts">
import { DodoPayments } from 'dodopayments-checkout'

const config = useRuntimeConfig()

// 确保只在客户端执行
if (import.meta.client) {
  // 根据你的环境配置决定是 test 还是 live
  // 这里假设 config.public.dodoEnvironment 存在，如果没有可以写死 'test'
  const dodoMode = (config.public.dodoEnvironment as 'test' | 'live') || 'test'

  DodoPayments.Initialize({
    mode: dodoMode,
    displayType: 'overlay',
    onEvent: (event) => {
      // 全局事件监听（可选）
      // 具体的业务回调（如关闭弹窗重置按钮）建议在组件内部处理
      console.log('[Dodo SDK] Global event:', event.event_type)
    }
  })
}
</script>

<template>
  <div>
    <nuxt-layout>
      <nuxt-page></nuxt-page>
    </nuxt-layout>
  </div>
</template>