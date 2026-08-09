interface DataDisplayProps {
  title: string
  description: string
  data: Array<{ label: string; value: string | number; color?: string }>
  features?: Array<{ title: string; description: string; color?: string }>
}

const DataDisplay = ({ title, description, data, features }: DataDisplayProps) => {
  return (
    <>
      <h2 className="text-2xl font-semibold text-white mb-4">
        {title}
      </h2>
      <p className="text-lg text-gray-300 mb-6">
        {description}
      </p>
      
      {/* Data display */}
      <div className="space-y-2 text-left max-w-lg mx-auto mb-6">
        {data.map((item, index) => (
          <p key={index} className="text-gray-300 flex flex-row items-center justify-between">
            <span className={`${item.color || 'text-blue-400'} w-40 inline-block`}>
              {item.label}:
            </span>
            <span className="text-white">{item.value}</span>
          </p>
        ))}
      </div>

      {/* Features explanation */}
      {features && (
        <div className="mt-6 p-4 bg-blue-600/20 border border-blue-600 rounded-lg">
          <h3 className="text-blue-400 font-semibold mb-2">{title} Feature Explanation</h3>
          <div className="text-sm text-gray-300 space-y-1">
            {features.map((feature, index) => (
              <p key={index}>
                • <strong>{feature.title}:</strong> {feature.description}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default DataDisplay 