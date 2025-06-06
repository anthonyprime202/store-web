import { type ColumnDef, type Row } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { useEffect, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Dialog } from '@radix-ui/react-dialog';
import { z } from 'zod';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { postToSheet } from '@/lib/fetchers';
import { toast } from 'sonner';
import { PuffLoader as Loader } from 'react-spinners';
import { Tabs, TabsContent } from '../ui/tabs';
import { ClipboardCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';
import { Input } from '../ui/input';

const statuses = ['Pending', 'Reject', 'Three Party', 'Regular'];
interface ApproveTableData {
    indentNo: string;
    indenter: string;
    department: string;
    product: string;
    quantity: number;
    uom: string;
    vendorType: 'Pending' | 'Reject' | 'Three Party' | 'Regular';
    date: string;
    attachment: string;
}

interface HistoryData {
    indentNo: string;
    indenter: string;
    department: string;
    product: string;
    uom: string;
    approvedQuantity: number;
    vendorType: 'Reject' | 'Three Party' | 'Regular';
    date: string;
    approvedDate: string;
}

export default () => {
    const { indentSheet, indentLoading, updateIndentSheet } = useSheets();
    const { user } = useAuth();

    const [selectedIndent, setSelectedIndent] = useState<ApproveTableData | null>(null);
    const [tableData, setTableData] = useState<ApproveTableData[]>([]);
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [openDialog, setOpenDialog] = useState(false);

    // Fetching table data
    useEffect(() => {
        setTableData(
            indentSheet
                .filter(
                    (sheet) =>
                        sheet.planned1 !== '' &&
                        sheet.actual1 === '' &&
                        sheet.indentType === 'Purchase'
                )
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    product: sheet.productName,
                    quantity: sheet.quantity,
                    uom: sheet.uom,
                    attachment: sheet.attachment,
                    vendorType: statuses.includes(sheet.vendorType)
                        ? (sheet.vendorType as ApproveTableData['vendorType'])
                        : 'Pending',
                    date: formatDate(new Date(sheet.timestamp)),
                }))
        );
        setHistoryData(
            indentSheet
                .filter(
                    (sheet) =>
                        sheet.planned1 !== '' &&
                        sheet.actual1 !== '' &&
                        sheet.indentType === 'Purchase'
                )
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    product: sheet.productName,
                    approvedQuantity: sheet.approvedQuantity || sheet.quantity,
                    vendorType: sheet.vendorType as HistoryData['vendorType'],
                    uom: sheet.uom,
                    date: formatDate(new Date(sheet.timestamp)),
                    approvedDate: formatDate(new Date(sheet.actual1)),
                }))
        );
    }, [indentSheet]);

    // Creating table columns
    const columns: ColumnDef<ApproveTableData>[] = [
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Department' },
        { accessorKey: 'product', header: 'Product' },
        { accessorKey: 'quantity', header: 'Quantity' },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'vendorType',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.vendorType;
                return <Pill variant="pending">{status}</Pill>;
            },
        },
        {
            accessorKey: 'attachment',
            header: 'Attachment',
            cell: ({ row }) => {
                const attachment = row.original.attachment;
                return attachment ? (
                    <a href={attachment} target="_blank">
                        Attachment
                    </a>
                ) : (
                    <></>
                );
            },
        },
        { accessorKey: 'date', header: 'Date' },
        ...(user.indentApprovalAction
            ? [
                  {
                      header: 'Action',
                      id: 'action',
                      cell: ({ row }: { row: Row<ApproveTableData> }) => {
                          const indent = row.original;
                          return (
                              <div>
                                  <DialogTrigger asChild>
                                      <Button
                                          variant="outline"
                                          onClick={() => {
                                              setSelectedIndent(indent);
                                          }}
                                      >
                                          Approve
                                      </Button>
                                  </DialogTrigger>
                              </div>
                          );
                      },
                  },
              ]
            : []),
    ];

    const historyColumns: ColumnDef<HistoryData>[] = [
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Department' },
        { accessorKey: 'product', header: 'Product' },
        { accessorKey: 'approvedQuantity', header: 'Quantity' },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'vendorType',
            header: 'Vendor Type',
            cell: ({ row }) => {
                const status = row.original.vendorType;
                const variant =
                    status === 'Reject' ? 'reject' : status === 'Regular' ? 'primary' : 'secondary';
                return (
                    <div>
                        <Pill variant={variant}>{status}</Pill>
                    </div>
                );
            },
        },
        { accessorKey: 'date', header: 'Request Date' },
        { accessorKey: 'approvedDate', header: 'Approval Date' },
    ];

    // Creating Form
    const schema = z
        .object({
            approval: z.enum(['Reject', 'Three Party', 'Regular']),
            approvedQuantity: z.coerce.number().optional(),
        })
        .superRefine((data, ctx) => {
            if (data.approval !== 'Reject') {
                if (!data.approvedQuantity || data.approvedQuantity === 0) {
                    ctx.addIssue({
                        path: ['approvedQuantity'],
                        code: z.ZodIssueCode.custom,
                    });
                }
            }
        });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { approvedQuantity: undefined, approval: undefined },
    });

    const approval = form.watch('approval');

    useEffect(() => {
        if (selectedIndent) {
            form.reset({
                approvedQuantity: selectedIndent.quantity,
            });
        }
    }, [selectedIndent]);

    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            await postToSheet(
                indentSheet
                    .filter((s) => s.indentNumber === selectedIndent?.indentNo)
                    .map((prev) => ({
                        ...prev,
                        vendorType: values.approval,
                        approvedQuantity: values.approvedQuantity,
                        actual1: new Date().toISOString(),
                    })),
                'update'
            );
            toast.success(`Updated approval status of ${selectedIndent?.indentNo}`);
            setOpenDialog(false);
            form.reset();
            setTimeout(() => updateIndentSheet(), 1000);
        } catch {
            toast.error('Failed to approve indent');
        }
    }

    function onError(e: FieldErrors<z.infer<typeof schema>>) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs defaultValue="pending">
                    <Heading
                        heading="Approve Indent"
                        subtext="Update Indent status to Approve or Reject them"
                        tabs
                    >
                        <ClipboardCheck size={50} className="text-primary" />
                    </Heading>
                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['product', 'department', 'indenter', 'vendorType']}
                            dataLoading={indentLoading}
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={['product', 'department', 'indenter', 'vendorType']}
                            dataLoading={indentLoading}
                        />
                    </TabsContent>
                </Tabs>

                {selectedIndent && (
                    <DialogContent>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="grid gap-5"
                            >
                                <DialogHeader className="grid gap-2">
                                    <DialogTitle>Approve Indent</DialogTitle>
                                    <DialogDescription>
                                        Approve indent{' '}
                                        <span className="font-medium">
                                            {selectedIndent.indentNo}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-3">
                                    <FormField
                                        control={form.control}
                                        name="approval"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Vendor Type</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select approval status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Regular">
                                                            Regular
                                                        </SelectItem>
                                                        <SelectItem value="Three Party">
                                                            Three Party
                                                        </SelectItem>
                                                        <SelectItem value="Reject">
                                                            Reject
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="approvedQuantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantity</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        disabled={approval === 'Reject'}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DialogClose>

                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && (
                                            <Loader
                                                size={20}
                                                color="white"
                                                aria-label="Loading Spinner"
                                            />
                                        )}
                                        Approve
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
};
