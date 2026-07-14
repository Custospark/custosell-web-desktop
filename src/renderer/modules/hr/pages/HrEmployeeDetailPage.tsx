import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useHrEmployee } from '../api/useHrQueries';
import { HrEmployeeDetailEditor } from './HrEmployeeDetailEditor';

export default function HrEmployeeDetailPage() {
  const { employeeId } = useParams();
  const id = Number(employeeId);
  const { data: employee, isLoading, isError } = useHrEmployee(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <CustosellLoader />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="space-y-4">
        <Link to={ROUTES.HR.PEOPLE} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to people
        </Link>
        <p className="text-sm text-gray-500">Employee not found or could not be loaded.</p>
      </div>
    );
  }

  return <HrEmployeeDetailEditor key={employee.id} employee={employee} />;
}
