import { useState, useEffect } from 'react';
import { Route, Switch, Redirect } from "wouter";
import Dashboard from "./pages/dashboard";
import MonochromeLoader from './components/ui/LoadingScreen';

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
          {/* Dashboard sebagai halaman utama */}
          <Route path="/" component={Dashboard} />
          
          {/* Redirect /dashboard ke / */}
          <Route path="/dashboard">
            {() => <Redirect to="/" />}
          </Route>
          
          {/* Fallback - redirect ke / */}
          <Route>
            {() => <Redirect to="/" />}
          </Route>
        </Switch>
      )}
    </>
  );
}

export default App;