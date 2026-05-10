import { Navigate } from "react-router-dom";
import PropTypes from 'prop-types';
import LoadingSpinner from "../components/Shared/LoadingSpinner";
import useRole from "../hooks/useRole";

const HostRoute = ({ children }) => {
    const [role, isLoading] = useRole();

    if (isLoading) return <LoadingSpinner />;
    if (role === 'host') return children;

    return <Navigate to="/dashboard" />;
};

export default HostRoute;

HostRoute.propTypes = {
    children: PropTypes.element
};