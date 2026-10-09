import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scale } from 'lucide-react';
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import IncomAndExpenceReportFilter from './IncomAndExpenceReportFilter';
import Preloader from '../../../common/Preloader';

const getToday = () => new Date().toISOString().split('T')[0];

const IncomAndExpenceReport = () => {
	const { t } = useTranslation();
	const { selectedBranchId, currentCurrency } = useAuth();
	const { loading: privilegeLoading, hasAccess, message } = usePrivileges('Account Summery');
	const [loading, setLoading] = useState(false);
	const [reportData, setReportData] = useState({ income: [], expense: [] });
	const [filters, setFilters] = useState({
		fromDate: `${new Date().getFullYear()}-01-01`,
		toDate: getToday(),
		reportType: 'income',
	});

    useEffect(()=>{
        if(!hasAccess){
            fetchReport();
        }
    },[filters.fromDate, filters.toDate, filters.reportType, selectedBranchId, currentCurrency,hasAccess]);

	const fetchReport = async () => {
		setLoading(true);
		try {
			const response = await axiosInstance.post('accountsummary/income-expense-report', {
				fromDate: filters.fromDate,
				toDate: filters.toDate,
				branchId: selectedBranchId || '1',
				currencyId: currentCurrency?.currencyName || currentCurrency?.currencyCode || currentCurrency?.currencyId || 'INR',
				ledgerName: '',
			});
			setReportData(response.data?.data || { income: [], expense: [] });
		} catch (error) {
			console.error('Income and expense report error:', error);
			setReportData({ income: [], expense: [] });
		} finally {
			setLoading(false);
		}
	};

	const handleFilterChange = (field, value) => {
		setFilters((previous) => ({ ...previous, [field]: value }));
	};

	const resetFilters = () => {
		setFilters({ fromDate: `${new Date().getFullYear()}-01-01`, toDate: getToday(), reportType: 'income' });
		setReportData({ income: [], expense: [] });
	};

	const decimalPart = 2;

	// Normalize both income (ledgerid/ledgername) and expense (ledger_id/ledger_name)
	// shapes into one consistent row shape for the table.
	const rows = (reportData[filters.reportType] || []).map((row, index) => ({
		sNo: row.sl_no || index + 1,
		ledgerId: row.ledgerid ?? row.ledger_id ?? '',
		ledgerName: row.ledgername ?? row.ledger_name ?? '-',
		amount: Number(row.amount || 0),
	}));

	const columns = [
		{ key: 'sNo', label: t('incomeExpenseReport.columns.sNo'), align: 'center', width: '70' },
		{ key: 'ledgerName', label: t('incomeExpenseReport.columns.ledgerName'), align: 'left' },
		{ key: 'amount', label: t('incomeExpenseReport.columns.amount'), align: 'right' },
	];

	const renderCell = (key, row) => {
		if (key === 'sNo') return row.sNo;
		if (key === 'ledgerName') return row.ledgerName;
		if (key === 'amount') return row.amount.toFixed(decimalPart);
		return row[key];
	};

	const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
	const footerData = rows.length > 0
		? { ledgerName: t('incomeExpenseReport.total') || 'Total', amount: totalAmount.toFixed(decimalPart) }
		: null;

	if (privilegeLoading) return <div>
        <BreadCrumb
				routes={[{ title: t('incomeExpenseReport.breadcrumb.group'), url: '#' }, { title: t('incomeExpenseReport.breadcrumb.title'), url: '#' }]}
				heading={{ icon: Scale, title: t('incomeExpenseReport.breadcrumb.title') }}
			/>
        <Preloader />

        </div>;
	if (!hasAccess) return <NoAcessComponent message={message} />;

	return (
		<div>
			<BreadCrumb
				routes={[
                    { title: t('incomeExpenseReport.breadcrumb.main'), url: '#' },
                    { title: t('incomeExpenseReport.breadcrumb.group'), url: '#' },
                    { title: t('incomeExpenseReport.breadcrumb.title'), url: '#' }
                ]}
				heading={{ icon: Scale, title: t('incomeExpenseReport.breadcrumb.title') }}
			/>
			<IncomAndExpenceReportFilter
				filters={filters}
				onFilterChange={handleFilterChange}
				onGenerateReport={fetchReport}
				loading={loading}
				resetFilters={resetFilters}
			/>
			<div className="mt-1 p-1">
				<ContentTable
					tableId="income-expense-report"
					columns={columns}
					data={rows}
					renderCell={renderCell}
					loading={loading}
					staticSearchable
					sortable
					footerData={footerData}
                    maxHeight="calc(100vh - 230px)"
				/>
			</div>
		</div>
	);
};

export default IncomAndExpenceReport;