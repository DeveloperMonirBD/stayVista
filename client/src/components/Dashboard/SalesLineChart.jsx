import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Chart } from 'react-google-charts';
import LoadingSpinner from '../Shared/LoadingSpinner';

// export const data = [
//     ['Day', 'Sales'],
//     ['9', 1000],
//     ['10', 1170],
//     ['11', 660],
//     ['12', 1030]
// ];

export const options = {
    title: 'Sales Over Time',
    curveType: 'function',
    legend: { position: 'bottom' },
    series: [{ color: '#F43F5E' }]
};

const SalesLineChart = ({ data }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setLoading(false);
        }, 2000);
    }, []);

    return (
        <>
            {loading ? (
                <LoadingSpinner smallHeight />
            ) : data.length > 1 ? (
                <Chart chartType="LineChart" width="100%" data={data} options={options} />
            ) : (
                <>
                    <LoadingSpinner smallHeight />
                    <p className="text-center text-gray-500">Not enough data to display chart</p>
                </>
            )}
        </>
    );
};

// Define prop types for the component
SalesLineChart.propTypes = {
    data: PropTypes.array.isRequired
};

export default SalesLineChart;
