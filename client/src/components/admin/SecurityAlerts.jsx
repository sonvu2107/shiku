import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Shield,
    X,
    AlertCircle,
    Ban,
    Bug
} from 'lucide-react';

/**
 * SecurityAlerts component - Real-time security alert notifications
 * Displays toast notifications for security events
 */
export default function SecurityAlerts({ alerts = [], onDismiss }) {
    const [visibleAlerts, setVisibleAlerts] = useState([]);

    useEffect(() => {
        setVisibleAlerts(alerts.slice(0, 5)); // Show max 5 alerts
    }, [alerts]);

    const getAlertIcon = (type) => {
        switch (type) {
            case 'SQL_INJECTION_ATTEMPT':
            case 'XSS_ATTEMPT':
                return <Bug className="text-red-500" size={18} />;
            case 'BRUTE_FORCE':
            case 'RATE_LIMIT_EXCEEDED':
                return <Ban className="text-orange-500" size={18} />;
            case 'UNAUTHORIZED_ACCESS':
                return <Shield className="text-yellow-500" size={18} />;
            default:
                return <AlertTriangle className="text-red-500" size={18} />;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'border-red-500 bg-red-50 dark:bg-red-900/20';
            case 'high':
                return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
            case 'medium':
                return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            default:
                return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
        }
    };

    const formatEventType = (type) => {
        const names = {
            'SQL_INJECTION_ATTEMPT': 'SQL Injection',
            'XSS_ATTEMPT': 'XSS Attack',
            'BRUTE_FORCE': 'Brute Force',
            'RATE_LIMIT_EXCEEDED': 'Rate Limit',
            'UNAUTHORIZED_ACCESS': 'Unauthorized Access'
        };
        return names[type] || type;
    };

    if (visibleAlerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            <AnimatePresence>
                {visibleAlerts.map((alert, index) => (
                    <motion.div
                        key={alert.id || index}
                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className={`p-3 rounded-xl border-l-4 shadow-lg backdrop-blur-sm ${getSeverityColor(alert.severity)}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                                        {formatEventType(alert.type)}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                                            alert.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                                                'bg-yellow-200 text-yellow-800'
                                        }`}>
                                        {alert.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                                    IP: {alert.ip || 'Unknown'}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString('vi-VN') : 'Just now'}
                                </p>
                            </div>
                            {onDismiss && (
                                <button
                                    onClick={() => onDismiss(alert.id || index)}
                                    className="flex-shrink-0 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                >
                                    <X size={14} className="text-neutral-500" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
