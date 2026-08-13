import React from 'react'
import ReactDOM from 'react-dom/client'
import { MaxUI } from '@maxhub/max-ui'
import '@maxhub/max-ui/dist/styles.css'
import './index.css'
import { BookingSeriesGatewayProvider } from '@/features/booking-series/gateway'
import { restBookingSeriesGateway } from '@/features/booking-series/restGateway'
import { createMaxLaunchContext, initializeLaunchContext } from '@/lib/launchContext'

initializeLaunchContext(createMaxLaunchContext())

void import('./App').then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MaxUI>
        <BookingSeriesGatewayProvider enabled gateway={restBookingSeriesGateway}>
          <App />
        </BookingSeriesGatewayProvider>
      </MaxUI>
    </React.StrictMode>,
  )
})
