import Header from '@/components/Header'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

const PageLayout = ({ children, className = "min-h-screen bg-black" }: PageLayoutProps) => {
  return (
    <main className={className}>
      <Header />
      {children}
    </main>
  )
}

export default PageLayout 