
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
      <div className="p-6 rounded-xl glass-panel max-w-md w-full text-center space-y-6">
        <div className="bg-notebook-100 dark:bg-notebook-900 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl font-semibold text-notebook-600 dark:text-notebook-400">404</span>
        </div>
        
        <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
        
        <p className="text-muted-foreground">
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        
        <Link to="/">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
