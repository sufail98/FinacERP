import PropTypes from 'prop-types';
import { RefreshCw } from 'lucide-react';
import DateInput from '@/components/elements/theme/DateInput';
import { useTranslation } from 'react-i18next';

const IncomAndExpenceReportFilter = ({
	filters,
	onFilterChange,
	onGenerateReport,
	loading,
	resetFilters,
}) => {
	const { t } = useTranslation();

	return (
		<div className="bg-white rounded-lg p-1 mb-4  ">
			<div className="flex flex-wrap items-end gap-4">
				<div className="w-[150px]">
					<DateInput
						label={t('reportFilters.fromDate')}
						name="fromDate"
						value={filters.fromDate}
						onChange={(e, value) => onFilterChange('fromDate', value)}
						max={new Date().toISOString().split('T')[0]}
						required
						className="w-full"
					/>
				</div>
				<div className="w-[150px]">
					<DateInput
						label={t('reportFilters.toDate')}
						name="toDate"
						value={filters.toDate}
						onChange={(e, value) => onFilterChange('toDate', value)}
						min={filters.fromDate}
						max={new Date().toISOString().split('T')[0]}
						required
						className="w-full"
					/>
				</div>

				<div className="flex-1">
					<label className="block text-xs font-medium text-gray-600 mb-1">
						{t('incomeExpenseReport.reportType')}
					</label>
					<div className="flex items-center gap-6 h-[38px]">
						{['income', 'expense'].map((type) => (
							<label key={type} className="flex items-center cursor-pointer">
								<input
									type="radio"
									name="reportType"
									value={type}
									checked={filters.reportType === type}
									onChange={(e) => onFilterChange('reportType', e.target.value)}
									className="w-4 h-4 text-blue-600 focus:ring-blue-500"
								/>
								<span className="ml-2 text-sm text-gray-700">
									{t(`incomeExpenseReport.${type}`)}
								</span>
							</label>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2 ml-auto">
					<button
						onClick={onGenerateReport}
						disabled={loading}
						className="h-[25px] px-4 main-bg text-white text-sm rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
					>
						{loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
						{loading ? t('loadingText') : t('reportFilters.generateReportBtn')}
					</button>
					<button
						onClick={resetFilters}
						disabled={loading}
						className="h-[25px] px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
						{t('reportFilters.resetBtn')}
					</button>
				</div>
			</div>
		</div>
	);
};

export default IncomAndExpenceReportFilter;

IncomAndExpenceReportFilter.propTypes = {
	filters: PropTypes.shape({
		fromDate: PropTypes.string.isRequired,
		toDate: PropTypes.string.isRequired,
		reportType: PropTypes.oneOf(['income', 'expense']).isRequired,
	}).isRequired,
	onFilterChange: PropTypes.func.isRequired,
	onGenerateReport: PropTypes.func.isRequired,
	loading: PropTypes.bool.isRequired,
	resetFilters: PropTypes.func.isRequired,
};
