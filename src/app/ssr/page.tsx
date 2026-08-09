import { PageLayout, DemoLayout, DataDisplay } from '@/components/layout'

// Force dynamic rendering - disable static optimization
export const dynamic = 'force-dynamic'

// Simulate fetching data from API, re-fetching every time
async function getSSRData() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Get request headers to prove this runs on server
  const timestamp = Date.now()
  
  return {
    requestTime: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    dataFetchTime: new Date().toISOString(),
    realtimeValue: Math.floor(Math.random() * 1000),
    timestamp: timestamp,
    serverHash: Math.random().toString(36).substring(7)
  }
}

// This page demonstrates Server-Side Rendering
export default async function SSRPage() {
  // This function is executed every time a request is made
  const data = await getSSRData()

  const codeExample = `// app/ssr/page.tsx
// 强制动态渲染 - 关闭静态优化
export const dynamic = 'force-dynamic'

export default async function SSRPage() {
  // 该函数在每次请求时都会在服务器端运行
  const data = await fetch('https://api.example.com/real-time-data', {
    cache: 'no-store' // 禁用缓存 - 确保每次数据都是最新的
  })
  
  const jsonData = await data.json()
  
  return (
    <div>
      <h2>SSR：服务端渲染</h2>
      <p>该页面每次请求都会在服务器端重新渲染。</p>
      <p>请求时间：{new Date().toISOString()}</p>
      <p>服务器时间：{new Date().toISOString()}</p>
      <p>实时数据：{jsonData.value}</p>
    </div>
  )
}`

  const ssrData = [
    { label: '请求时间', value: data.requestTime, color: 'text-green-400' },
    { label: '服务器时间', value: data.serverTime, color: 'text-blue-400' },
    { label: '数据获取时间', value: data.dataFetchTime, color: 'text-yellow-400' },
    { label: '实时数值', value: data.realtimeValue, color: 'text-purple-400' },
    { label: '时间戳', value: data.timestamp, color: 'text-red-400' },
    { label: '服务器哈希', value: data.serverHash, color: 'text-indigo-400' }
  ]

  const ssrFeatures = [
    { title: '实时渲染', description: '每次请求都在服务器端实时渲染' },
    { title: '动态内容', description: '内容始终保持最新且个性化' },
    { title: '服务器处理', description: '每次请求都需要服务器端处理' },
    { title: '对搜索引擎友好', description: '搜索引擎可以抓取完整的渲染内容' }
  ]

  return (
    <PageLayout>
      <DemoLayout
        title="SSR"
        subtitle="每次请求都在服务器端实时渲染，确保内容始终是最新的。"
        description="适合对 SEO 和即时数据更新要求较高的动态、个性化内容。这可以确保交互式用户门户或实时数据分析平台等应用的搜索引擎可见性，以及信息始终实时显示。"
        codeExample={codeExample}
        renderMode="SSR"
        dataDisplay={
          <DataDisplay
            title="SSR：服务端渲染"
            description="该页面在每次请求时都会重新渲染，时间戳等数据会实时更新。"
            data={ssrData}
            features={ssrFeatures}
          />
        }
      />
    </PageLayout>
  )
} 