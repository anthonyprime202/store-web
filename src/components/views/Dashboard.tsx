import Heading from '../element/Heading';
import {
    CalendarIcon,
    ClipboardList,
    LayoutDashboard,
    PackageCheck,
    Truck,
    Warehouse,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '../ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useEffect, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import type { ColumnDef } from '@tanstack/react-table';
import { Pill } from '../ui/pill';
import DataTable from '../element/DataTable';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { ComboBox } from '../ui/combobox';
import { analyzeData } from '@/lib/filter';

interface InventoryTable {
    itemName: string;
    groupHead: string;
    uom: string;
    status: string;
    opening: number;
    rate: number;
    indented: number;
    approved: number;
    purchaseQuantity: number;
    outQuantity: number;
    current: number;
    totalPrice: number;
}

function CustomChartTooltipContent({
    payload,
    label,
}: {
    payload?: { payload: { quantity: number; frequency: number } }[];
    label?: string;
}) {
    if (!payload?.length) return null;

    const data = payload[0].payload;

    return (
        <div className="rounded-md border bg-white px-3 py-2 shadow-sm text-sm">
            <p className="font-medium">{label}</p>
            <p>Quantity: {data.quantity}</p>
            <p>Frequency: {data.frequency}</p>
        </div>
    );
}
export default function UsersTable() {
    const { receivedSheet, indentSheet, inventorySheet, inventoryLoading } = useSheets();

    const [tableData, setTableData] = useState<InventoryTable[]>([]);
    const [chartData, setChartData] = useState<
        {
            name: string;
            quantity: number;
            frequency: number;
        }[]
    >([]);
    const [topVendorsData, setTopVendors] = useState<
        {
            name: string;
            orders: number;
            quantity: number;
        }[]
    >([]);

    // Items
    const [indent, setIndent] = useState({ count: 0, quantity: 0 });
    const [purchase, setPurchase] = useState({ count: 0, quantity: 0 });
    const [out, setOut] = useState({ count: 0, quantity: 0 });
    const [alerts, setAlerts] = useState({ lowStock: 0, outOfStock: 0 });

    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [filteredVendors, setFilteredVendors] = useState<string[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<string[]>([]);
    const [allVendors, setAllVendors] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<string[]>([]);

    useEffect(() => {
        setTableData(
            inventorySheet.map((i) => ({
                totalPrice: i.totalPrice,
                approvedIndents: i.approved,
                uom: i.uom,
                rate: i.individualRate,
                current: i.current,
                status: i.colorCode,
                indented: i.indented,
                opening: i.opening,
                itemName: i.itemName,
                groupHead: i.groupHead,
                purchaseQuantity: i.purchaseQuantity,
                approved: i.approved,
                outQuantity: i.outQuantity,
            }))
        );
        setAlerts({
            lowStock: inventorySheet.filter(
                (i) => i.current !== 0 && i.colorCode.toLowerCase() === 'red'
            ).length,
            outOfStock: inventorySheet.filter((i) => i.current === 0).length,
        });
    }, [inventorySheet]);

    useEffect(() => {
        setAllVendors(Array.from(new Set(indentSheet.map((item) => item.approvedVendorName))));
        setAllProducts(Array.from(new Set(indentSheet.map((item) => item.productName))));
        const {
            topVendors,
            topProducts,
            issuedIndentCount,
            approvedIndentCount,
            totalIssuedQuantity,
            receivedPurchaseCount,
            totalApprovedQuantity,
            totalPurchasedQuantity,
        } = analyzeData(
            { receivedSheet, indentSheet },
            {
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                vendors: filteredVendors,
                products: filteredProducts,
            }
        );

        setChartData(
            topProducts.map((p) => ({ frequency: p.freq, quantity: p.quantity, name: p.name })).slice(0, 10)
        );
        setTopVendors(topVendors.slice(0, 10));
        setIndent({ quantity: totalApprovedQuantity, count: approvedIndentCount });
        setPurchase({ quantity: totalPurchasedQuantity, count: receivedPurchaseCount });
        setOut({ quantity: totalIssuedQuantity, count: issuedIndentCount });
    }, [startDate, endDate, filteredProducts, filteredVendors, indentSheet, receivedSheet]);

    const columns: ColumnDef<InventoryTable>[] = [
        { accessorKey: 'itemName', header: 'Item' },
        { accessorKey: 'groupHead', header: 'Group Head' },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'rate',
            header: 'Rate',
            cell: ({ row }) => {
                return <>&#8377;{row.original.rate}</>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const code = row.original.status.toLowerCase();
                if (row.original.current === 0) {
                    return <Pill variant="reject">Out of Stock</Pill>;
                }
                if (code === 'red') {
                    return <Pill variant="pending">Low Stock</Pill>;
                }
                if (code === 'purple') {
                    return <Pill variant="primary">Excess</Pill>;
                }
                return <Pill variant="secondary">In Stock</Pill>;
            },
        },
        { accessorKey: 'indented', header: 'Indented' },
        { accessorKey: 'approved', header: 'Approved' },
        { accessorKey: 'purchaseQuantity', header: 'Purchased' },
        { accessorKey: 'outQuantity', header: 'Issued' },
        { accessorKey: 'current', header: 'Quantity' },
        {
            accessorKey: 'totalPrice',
            header: 'Total Price',

            cell: ({ row }) => {
                return <>&#8377;{row.original.totalPrice}</>;
            },
        },
    ];

    const chartConfig = {
        quantity: {
            label: 'Quantity',
            color: 'var(--color-primary)',
        },
    } satisfies ChartConfig;
    return (
        <div>
            <Heading heading="Dashboard" subtext="View you analytics">
                <LayoutDashboard size={50} className="text-primary" />
            </Heading>

            <div className="grid gap-3 m-3">
                <div className="flex gap-3 align-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                data-empty={!startDate}
                                className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
                            >
                                <CalendarIcon />
                                {startDate ? (
                                    format(startDate, 'PPP')
                                ) : (
                                    <span>Pick a start date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                data-empty={!endDate}
                                className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
                            >
                                <CalendarIcon />
                                {endDate ? format(endDate, 'PPP') : <span>Pick a end date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                        </PopoverContent>
                    </Popover>
                    <ComboBox
                        multiple
                        options={allVendors.map((v) => ({ label: v, value: v }))}
                        value={filteredVendors}
                        onChange={setFilteredVendors}
                        placeholder="Select Vendors"
                    />
                    <ComboBox
                        multiple
                        options={allProducts.map((v) => ({ label: v, value: v }))}
                        value={filteredProducts}
                        onChange={setFilteredProducts}
                        placeholder="Select Products"
                    />
                </div>

                <div className="grid md:grid-cols-4 gap-3">
                    <Card className="bg-gradient-to-br from-transparent to-blue-500/10">
                        <CardContent>
                            <div className="text-blue-500 flex justify-between">
                                <p className="font-semibold">Total Indents</p>
                                <ClipboardList size={18} />
                            </div>
                            <p className="text-3xl font-bold text-blue-800">{indent.count}</p>
                            <div className="text-blue-500 flex justify-between">
                                <p className="text-sm ">Indented Quantity</p>
                                <p>{indent.quantity}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-transparent to-green-500/10">
                        <CardContent>
                            <div className="text-green-500 flex justify-between">
                                <p className="font-semibold">Total Purchases</p>
                                <Truck size={18} />
                            </div>
                            <p className="text-3xl font-bold text-green-800">{purchase.count}</p>
                            <div className="text-green-500 flex justify-between">
                                <p className="text-sm ">Purchased Quantity</p>
                                <p>{purchase.quantity}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-transparent to-orange-500/10">
                        <CardContent>
                            <div className="text-orange-500 flex justify-between">
                                <p className="font-semibold">Total Issued</p>
                                <PackageCheck size={18} />
                            </div>
                            <p className="text-3xl font-bold text-orange-800">{out.count}</p>

                            <div className="text-orange-500 flex justify-between">
                                <p className="text-sm ">Out Quantity</p>
                                <p>{out.quantity}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-transparent to-yellow-500/10 text-yellow-500 ">
                        <CardContent>
                            <div className="flex justify-between">
                                <p className="font-semibold">Out of Stock</p>
                                <Warehouse size={18} />
                            </div>
                            <p className="text-3xl font-bold text-yellow-800">
                                {alerts.outOfStock}
                            </p>

                            <div className="text-yellow-500 flex justify-between">
                                <p className="text-sm ">Low in Stock</p>
                                <p>{alerts.lowStock}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <Card className="w-[55%] min-w-50 flex-grow">
                        <CardHeader>
                            <CardTitle className="text-xl">Top Purchased Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer className="max-h-80 w-full" config={chartConfig}>
                                <BarChart
                                    accessibilityLayer
                                    data={chartData}
                                    layout="vertical"
                                    margin={{
                                        right: 16,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="barGradient"
                                            x1="0"
                                            y1="0"
                                            x2="1"
                                            y2="0"
                                        >
                                            <stop offset="100%" stopColor="#3b82f6" />{' '}
                                            {/* Tailwind blue-500 */}
                                            <stop offset="0%" stopColor="#2563eb" />{' '}
                                            {/* Tailwind blue-600 */}
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid horizontal={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                        tickFormatter={(value: any) => value.slice(0, 3)}
                                        hide
                                    />
                                    <XAxis dataKey="frequency" type="number" hide />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<CustomChartTooltipContent />}
                                    />
                                    <Bar
                                        dataKey="frequency"
                                        layout="vertical"
                                        fill="url(#barGradient)"
                                        radius={4}
                                    >
                                        <LabelList
                                            dataKey="name"
                                            position="insideLeft"
                                            offset={8}
                                            className="fill-(--color-background) font-semibold"
                                            fontSize={12}
                                        />
                                        <LabelList
                                            dataKey="frequency"
                                            position="insideRight"
                                            offset={8}
                                            className="fill-(--color-background) font-semibold"
                                            fontSize={12}
                                        />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card className="flex-grow min-w-150 w-[40%]">
                        <CardHeader>
                            <CardTitle className="text-xl">Top Vendors</CardTitle>
                        </CardHeader>
                        <CardContent className="text-base grid gap-2">
                            {topVendorsData.map((vendor, i) => (
                                <div className="flex justify-between" key={i}>
                                    <p className="font-semibold text-md">{vendor.name}</p>
                                    <div className="flex gap-5">
                                        <p>{vendor.orders} Orders</p>
                                        <p>{vendor.quantity} Items</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Inventory</CardTitle>
                        <CardContent>
                            <DataTable
                                data={tableData}
                                columns={columns}
                                dataLoading={inventoryLoading}
                                searchFields={['itemName', 'groupHead', 'uom', 'status']}
                            />
                        </CardContent>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
