import { useState, useEffect } from "react";
import { Sparkles, Clock, DollarSign, TrendingUp, X } from "lucide-react";
import { fetchFlightRecommendations } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "@tanstack/react-router";
import { currency } from "@/data/flights";

export default function Recommendations({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("value");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const sortOptions = [
    { value: "value", label: "Best Value", icon: TrendingUp },
    { value: "price", label: "Lowest Price", icon: DollarSign },
    { value: "duration", label: "Shortest Duration", icon: Clock },
    { value: "morning", label: "Morning Departures", icon: Sparkles },
  ];

  useEffect(() => {
    if (open) {
      loadRecommendations();
    }
  }, [open, sortBy]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const data = await fetchFlightRecommendations({ sortBy, limit: 6 });
      setRecommendations(data);
    } catch (err) {
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleFlightClick = (flight) => {
    navigate({
      to: "/search",
      search: {
        from: flight.from,
        to: flight.to,
        date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        passengers: 1,
        sortBy: sortBy === "value" ? "cheapest" : sortBy,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Recommended Flights
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sort Options */}
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(option.value)}
                  className="flex items-center gap-2"
                >
                  <Icon className="size-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>

          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading recommendations...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {recommendations && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Showing {recommendations.flights.length} flights sorted by {sortBy}
              </p>

              {recommendations.flights.map((flight) => (
                <div
                  key={flight.id}
                  className="soft-card p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleFlightClick(flight)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg">{flight.flightNumber}</span>
                        <Badge variant="secondary" className="text-xs">
                          {flight.airline}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <p className="font-semibold">{flight.fromCode}</p>
                          <p className="text-muted-foreground text-xs">{flight.departure}</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-full border-t border-dashed border-border relative">
                            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-background px-2 text-xs text-muted-foreground">
                              {flight.duration}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold">{flight.toCode}</p>
                          <p className="text-muted-foreground text-xs">{flight.arrival}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{flight.aircraft}</span>
                        {flight.stops === 0 ? (
                          <span className="text-emerald-600">Non-stop</span>
                        ) : (
                          <span>{flight.stops} stop{flight.stops > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-display text-xl font-bold">{currency(flight.price)}</p>
                      {flight.recommendationReason && (
                        <p className="text-xs text-primary mt-1">{flight.recommendationReason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {recommendations.meta?.notice && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  {recommendations.meta.notice}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
