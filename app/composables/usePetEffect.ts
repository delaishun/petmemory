// app/composables/usePetEffect.ts

export const useEffectBackgrounds = () => {
  // 集中管理特效背景图数组 (索引 0-10)
  const EFFECT_BACKGROUNDS = [
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/Heaven.jpg',       // 0: 天堂 (默认)
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/Christmas.jpg',    // 1: 圣诞
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/Halloween.jpg',    // 2: 万圣节
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/Valentine.jpg',    // 3: 情人节
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/Spring.jpg',       // 4: 春节
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/Easter.jpg',       // 5: 复活节
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/Thanksgiving.jpg', // 6: 感恩节 (新增)
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/DoubleNinth.jpg',  // 7: 重阳节 (新增)
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/TombSweeping.jpg', // 8: 清明节 (新增)
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/LoongBoat.jpg',    // 9: 端午节 (新增)
    'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/MidAutumn.jpg'     // 10: 中秋节 (新增)
  ]

  // 对应的 CSS 类名
  const EFFECT_CLASSES = [
    'effect-heaven',
    'effect-christmas',
    'effect-halloween',
    'effect-valentine',
    'effect-spring',
    'effect-easter',
    'effect-thanksgiving', // 新增
    'effect-double-ninth', // 新增
    'effect-tomb-sweeping',// 新增
    'effect-loong-boat',   // 新增
    'effect-mid-autumn'    // 新增
  ]

  // 获取当前日期对应的节日索引
  function getCurrentEffectIndex(): number {
    const now = new Date()
    const month = now.getMonth() + 1
    const date = now.getDate()

    // ================= 12月 =================
    // 圣诞：12月15日 - 12月31日
    if (month === 12 && date >= 15) return 1

    // ================= 11月 =================
    // 感恩节 (11月第四个星期四，约在11.23-11.29)
    if (month === 11 && date >= 23 && date <= 29) return 6

    // ================= 10月 =================
    // 万圣节：10月25日 - 11月1日
    if ((month === 10 && date >= 25) || (month === 11 && date === 1)) return 2
    // 重阳节 (农历九月初九，约在10.05-10.20)
    if (month === 10 && date >= 5 && date <= 20) return 7

    // ================= 9月 =================
    // 中秋节 (农历八月十五，约在9.14-9.26)
    if (month === 9 && date >= 14 && date <= 26) return 10

    // ================= 6月 =================
    // 端午节 (农历五月初五，约在6.08-6.20)
    if (month === 6 && date >= 8 && date <= 20) return 9

    // ================= 4月 / 3月 =================
    // 清明节 (公历4月4日-4月6日左右，放3月底以防重叠)
    if (month === 3 && date >= 25) return 8
    // 复活节：粗略估计 4月1日 - 4月15日
    if (month === 4 && date >= 1 && date <= 15) return 5

    // ================= 2月 / 1月 =================
    // 情人节：2月10日 - 2月16日 (优先级高于春节)
    if (month === 2 && date >= 10 && date <= 16) return 3
    // 春节：粗略估计 1月20日 - 2月20日
    if ((month === 1 && date >= 20) || (month === 2 && date <= 20)) return 4

    // 默认天堂
    return 0
  }

  // 获取特效类名
  function getEffectClass(isVip?: boolean): string {
    if (!isVip) return ''
    return EFFECT_CLASSES[getCurrentEffectIndex()] || ''
  }

  // 获取特效背景样式
  function getEffectStyle(isVip?: boolean) {
    if (!isVip) return {}
    return {
      backgroundImage: `url(${EFFECT_BACKGROUNDS[getCurrentEffectIndex()]})`,
    }
  }

  return {
    getCurrentEffectIndex,
    getEffectClass,
    getEffectStyle
  }
}