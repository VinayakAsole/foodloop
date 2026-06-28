import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  requestNotificationPermission, 
  onMessageListener, 
  simulateLocalNotification 
} from '../../firebase/messaging';
import { 
  Bell, 
  BellRing, 
  Trash2, 
  ShoppingBag,
  Clock,
  AlertCircle
} from 'lucide-react';

export const Notifications = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState(() => {
    return JSON.parse(localStorage.getItem('foodloop_notification_logs') || '[]');
  });
  const [token, setToken] = useState(null);

  // Initialize notifications logs from LocalStorage
  useEffect(() => {
    // Listen to real notification events
    const unsubscribe = onMessageListener((payload) => {
      const newLog = {
        id: Date.now(),
        title: payload.notification?.title || "Notification Received",
        body: payload.notification?.body || "",
        timestamp: new Date().toLocaleTimeString(),
        type: payload.data?.type || 'info'
      };
      
      setLogs((prev) => {
        const updated = [newLog, ...prev].slice(0, 15); // limit to 15 logs
        localStorage.setItem('foodloop_notification_logs', JSON.stringify(updated));
        return updated;
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleRequestPermission = async () => {
    const fcmToken = await requestNotificationPermission(user?.uid);
    if (fcmToken) {
      setToken(fcmToken);
      simulateLocalNotification(
        "Notifications Enabled!",
        "You will now receive real-time push alerts for orders, kitchen updates, and food counter status.",
        "success"
      );
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    localStorage.removeItem('foodloop_notification_logs');
  };

  return (
    <div className="min-h-screen bg-[#060709] max-w-4xl mx-auto px-4 py-6 md:px-8 space-y-6">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Bell className="text-primary-500" size={24} />
            <span>Real-Time Notifications Portal</span>
          </h1>
          <p className="text-xs text-gray-400">Receive and track push alerts directly in the browser.</p>
        </div>

        <button
          onClick={handleRequestPermission}
          className="flex items-center space-x-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-primary-500/10 cursor-pointer"
        >
          <BellRing size={14} />
          <span>Enable Web Pushes</span>
        </button>
      </div>

      <div className="space-y-6">
        {token && (
          <div className="responsive-card p-5 space-y-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">FCM Web Push Registration Token</span>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={token}
                className="flex-grow px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-300 font-mono select-all focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(token);
                  alert("FCM token copied to clipboard!");
                }}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Copy
              </button>
            </div>
            <p className="text-[10px] text-gray-500">Use this token to send real-world push alerts directly from your Firebase Console under Cloud Messaging.</p>
          </div>
        )}

        {/* NOTIFICATION FEED */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pushes Feed Logs</h3>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear Logs</span>
              </button>
            )}
          </div>

          {logs.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="responsive-card p-4 flex gap-3 animate-slide-in"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    log.type === 'success' ? 'bg-secondary-500/10 text-secondary-500' :
                    log.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {log.type === 'success' ? <ShoppingBag size={18} /> : 
                     log.type === 'warning' ? <AlertCircle size={18} /> : 
                     <Clock size={18} />}
                  </div>
                  
                  <div className="flex-grow space-y-1 text-left">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-white leading-tight">{log.title}</h4>
                      <span className="text-[9px] text-gray-500 font-medium">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-normal">{log.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="responsive-card p-16 text-center text-gray-400 flex flex-col items-center justify-center">
              <Bell size={40} className="text-gray-600 mb-2" />
              <p className="text-xs">No notifications captured yet.</p>
              <p className="text-[10px] text-gray-500 mt-1">Real-time alerts received while using the app will be logged here.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Notifications;
