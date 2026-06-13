 // src/App.tsx
import { useState, useEffect } from 'react';
import { Route, Switch, Redirect } from "wouter";
import Home from "./pages/Home";
import AuthPage from "./pages/auth";
import Dashboard from "./pages/dashboard";
import { getCurrentUser } from "./lib/auth";
import MonochromeLoader from './components/ui/LoadingScreen';

// Protected Route Component
function ProtectedRoute({ component: Component, ...rest }: any) {
  // Pastikan hanya dijalankan di browser
  if (typeof window === 'undefined') {
    return null;
  }
  
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    return <Redirect to="/auth" />;
  }
  
  return <Component {...rest} />;
}

function App() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);

  // Simulasi loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        // Jika halaman sudah siap, langsung lompat ke 100%
        if (isPageReady) {
          clearInterval(interval);
          return 100;
        }

        // Jika belum siap, progress maksimal 95%
        const increment = Math.random() * 3 + 1;
        const newProgress = prevProgress + increment;

        if (newProgress >= 95) {
          return 95;
        }

        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPageReady]);

  // Deteksi ketika window sudah fully loaded
  useEffect(() => {
    const handleLoad = () => {
      setIsPageReady(true);
    };

    if (document.readyState === 'complete') {
      setIsPageReady(true);
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => window.removeEventListener('load', handleLoad);
  }, []);

  // Hide loader ketika progress mencapai 100%
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500); // Delay 500ms sebelum hilang

      return () => clearTimeout(timer);
    }
  }, [progress]);

  return (
    <>
      {isLoading && <MonochromeLoader progress={progress} />}
      
      {!isLoading && (
        <Switch>
          {/* Home sebagai halaman utama */}
          <Route path="/" component={Home} />
          
          {/* Auth page - login page dengan design glassmorphism */}
          <Route path="/auth" component={AuthPage} />
          
          {/* Protected Dashboard */}
          <Route path="/dashboard">
            {(params) => <ProtectedRoute component={Dashboard} {...params} />}
          </Route>
          
          {/* Fallback - redirect ke home */}
          <Route>
            {() => <Redirect to="/" />}
          </Route>
        </Switch>
      )}
    </>
  );
}

export default App;