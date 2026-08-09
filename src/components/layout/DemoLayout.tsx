import { Button } from '@/components/ui/button'

interface DemoLayoutProps {
  title: string
  subtitle: string
  description: string
  codeExample: string
  dataDisplay: React.ReactNode
  renderMode: 'SSR' | 'ISR'
  className?: string
}

const DemoLayout = ({
  subtitle,
  description,
  codeExample,
  dataDisplay,
  renderMode,
  className = '',
}: DemoLayoutProps) => {
  const modeStyles = renderMode === 'SSR'
    ? 'bg-orange-600/20 border-orange-600 text-orange-400'
    : 'bg-green-600/20 border-green-600 text-green-400'

  return (
    <div className={className}>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          EdgeOne Pages Next.js Starter - {renderMode}
        </h1>
        <p className="text-xl text-gray-300 mb-4">{subtitle}</p>
        <p className="text-lg text-gray-400 mb-8">{description}</p>
        <a href="https://pages.edgeone.ai/document/framework-nextjs" target="_blank" rel="noopener noreferrer">
          <Button size="lg" variant="outline" className="hover:bg-gray-700 text-white px-8 py-3 text-lg cursor-pointer">
            View Documentation
          </Button>
        </a>
      </div>

      <div className="container mx-auto px-4 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
          <div className="bg-gray-900 rounded p-6 text-left">
            <pre className="text-sm text-gray-200">{codeExample}</pre>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mb-20">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 text-center">
          <div className={`${modeStyles} border rounded-lg p-4 mb-6`}>
            <p className="text-sm">This page uses the {renderMode} strategy.</p>
          </div>
          {dataDisplay}
        </div>
      </div>
    </div>
  )
}

export default DemoLayout
