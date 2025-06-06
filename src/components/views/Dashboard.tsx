import Heading from '../element/Heading';
import { LayoutDashboard } from 'lucide-react';

export default function UsersTable() {

    return (
        <div>
            <Heading heading="Dashboard" subtext="View you analytics">
                <LayoutDashboard size={50} className="text-primary" />
            </Heading>
        </div>
    );
}
