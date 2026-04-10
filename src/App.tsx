import InventoryDashboard from './components/InventoryDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <InventoryDashboard />
    </ErrorBoundary>
  );
}
