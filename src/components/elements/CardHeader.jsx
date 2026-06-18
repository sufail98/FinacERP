import { Building2 } from 'lucide-react'
import { CardDescription, CardTitle } from '../ui/card'

const CardHeader = ({title,description}) => {
  return (
    <div>
       <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6" />
            <CardTitle className="text-2xl font-bold text-gray-900">{title}</CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            {description}
          </CardDescription>
        </CardHeader>
    </div>
  )
}

export default CardHeader
