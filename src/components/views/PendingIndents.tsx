import { ListTodo } from 'lucide-react';
import Heading from '../element/Heading';
import { Tabs, TabsContent } from '../ui/tabs';
import { useSheets } from '@/context/SheetsContext';
import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import DataTable from '../element/DataTable';

interface PendingIndentsData {
    date: string;
    indentNo: string;
    product: string;
    quantity: number;
    rate: number;
    uom: string;
    vendorName: string;
    paymentTerm: string;
    specifications: string;
}

interface HistoryData {
    indentDate: string;
    date: string;
    indentNo: string;
    poNumber: string;
    product: string;
    quantity: number;
    rate: number;
    uom: string;
    poCopy: string;
}

export default () => {
    const { indentSheet, indentLoading } = useSheets();

    const [tableData, setTableData] = useState<PendingIndentsData[]>([]);
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);

    // Fetching table data
    useEffect(() => {
        setTableData(
            indentSheet
                .filter((sheet) => sheet.planned4 !== '' && sheet.actual4 === '' && sheet.actual3 !== '')
                .map((sheet) => ({
                    date: formatDate(new Date(sheet.timestamp)),
                    indentNo: sheet.indentNumber,
                    product: sheet.productName,
                    quantity: sheet.approvedQuantity,
                    rate: sheet.approvedRate,
                    uom: sheet.uom,
                    vendorName: sheet.approvedVendorName,
                    paymentTerm: sheet.approvedPaymentTerm,
                    specifications: sheet.specifications || '',
                }))
        );
        setHistoryData(
            indentSheet
                .filter((sheet) => sheet.planned4 !== '' && sheet.actual4 !== '')
                .map((sheet) => ({
                    indentDate: formatDate(new Date(sheet.timestamp)),
                    date: formatDate(new Date(sheet.actual4)),
                    indentNo: sheet.indentNumber,
                    poNumber: sheet.poNumber,
                    product: sheet.productName,
                    quantity: sheet.approvedQuantity,
                    rate: sheet.approvedRate,
                    uom: sheet.uom,
                    poCopy: sheet.poCopy,
                }))
        );
    }, [indentSheet]);

    // Creating table columns
    const columns: ColumnDef<PendingIndentsData>[] = [
        { accessorKey: 'date', header: 'Date' },
        { accessorKey: 'indentNo', header: 'Indent Number' },
        { accessorKey: 'product', header: 'Product' },
        { accessorKey: 'quantity', header: 'Quantity' },
        {
            accessorKey: 'rate',
            header: 'Rate',
            cell: ({ row }) => {
                return <>&#8377;{row.original.rate}</>;
            },
        },
        { accessorKey: 'uom', header: 'UOM' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'paymentTerm', header: 'Payment Term' },
        { accessorKey: 'specifications', header: 'Specifications' },
    ];

    const historyColumns: ColumnDef<HistoryData>[] = [
        { accessorKey: 'indentDate', header: 'Indent Date' },
        { accessorKey: 'date', header: 'PO Date' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'poNumber', header: 'PO Number' },
        { accessorKey: 'product', header: 'Product' },
        { accessorKey: 'quantity', header: 'Quantity' },
        {
            accessorKey: 'rate',
            header: 'Rate',
            cell: ({ row }) => {
                return <>&#8377;{row.original.rate}</>;
            },
        },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'poCopy',
            header: 'PO Copy',
            cell: ({ row }) => {
                const attachment = row.original.poCopy;
                return attachment ? (
                    <a href={attachment} target="_blank">
                        PDF
                    </a>
                ) : (
                    <></>
                );
            },
        },
    ];

    return (
        <div>
            <Tabs defaultValue="pending">
                <Heading heading="Pending Indents" subtext="Indents Pending for Order" tabs>
                    <ListTodo size={50} className="text-primary" />
                </Heading>
                <TabsContent value="pending">
                    <DataTable
                        data={tableData}
                        columns={columns}
                        searchFields={['product', 'vendorName', 'paymentTerm', 'specifications']}
                        dataLoading={indentLoading}
                    />
                </TabsContent>
                <TabsContent value="history">
                    <DataTable
                        data={historyData}
                        columns={historyColumns}
                        searchFields={['product', 'poNumber']}
                        dataLoading={indentLoading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};
