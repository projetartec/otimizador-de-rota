/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { Plus, Trash2, MapPin, Navigation, Loader2, Info, Share2, GripVertical, Copy, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast, Toaster } from "sonner";
import Map from "./components/Map";
import { AddressInput } from "./components/AddressInput";
import { geocode, Location } from "./lib/geocoding";
import { optimizeRoute, OptimizedStop } from "./lib/optimization";

export default function App() {
  const [startAddress, setStartAddress] = useState("");
  const [stopAddresses, setStopAddresses] = useState<string[]>([""]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [optimizedStops, setOptimizedStops] = useState<OptimizedStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const addStop = () => {
    setLastAddedIndex(stopAddresses.length);
    setStopAddresses([...stopAddresses, ""]);
  };

  const removeStop = (index: number) => {
    const newStops = [...stopAddresses];
    newStops.splice(index, 1);
    setStopAddresses(newStops);
  };

  const updateStop = (index: number, value: string) => {
    const newStops = [...stopAddresses];
    newStops[index] = value;
    setStopAddresses(newStops);
  };

  const calculateRoute = async () => {
    if (!startAddress.trim()) {
      setError("Por favor, insira um ponto de partida.");
      return;
    }

    const validStops = stopAddresses.filter((s) => s.trim() !== "");
    if (validStops.length === 0) {
      setError("Por favor, insira pelo menos uma parada.");
      return;
    }

    setIsCalculating(true);
    setError(null);
    setLastAddedIndex(null);

    try {
      // Geocode start
      const start = await geocode(startAddress);
      if (!start) {
        setError("Não foi possível encontrar o endereço de partida.");
        setIsCalculating(false);
        return;
      }
      setStartLocation(start);

      // Geocode stops
      const stopLocations: Location[] = [];
      for (const address of validStops) {
        const loc = await geocode(address);
        if (loc) {
          stopLocations.push(loc);
        } else {
          console.warn(`Could not geocode address: ${address}`);
        }
      }

      if (stopLocations.length === 0) {
        setError("Não foi possível encontrar nenhum dos endereços de parada.");
        setIsCalculating(false);
        return;
      }

      // Optimize
      const optimized = optimizeRoute(start, stopLocations);
      setOptimizedStops(optimized);
      
      // Reorganize input fields to match optimized order
      const optimizedAddresses = optimized.map(stop => stop.address);
      setStopAddresses(optimizedAddresses);
    } catch (err) {
      setError("Ocorreu um erro ao calcular a rota.");
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  const shareRoute = () => {
    if (!startLocation || optimizedStops.length === 0) return;

    const origin = encodeURIComponent(startLocation.address);
    const destination = encodeURIComponent(optimizedStops[optimizedStops.length - 1].address);
    const waypoints = optimizedStops
      .slice(0, -1)
      .map((stop) => encodeURIComponent(stop.address))
      .join("|");

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;

    setShareUrl(googleMapsUrl);
    setIsShareDialogOpen(true);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const resetRoute = () => {
    setStartAddress("");
    setStopAddresses([""]);
    setStartLocation(null);
    setOptimizedStops([]);
    setError(null);
    setLastAddedIndex(null);
    setShareUrl("");
    toast.info("Dados resetados com sucesso");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-950 text-zinc-100 overflow-hidden md:overflow-hidden">
      <Toaster position="top-center" richColors theme="dark" />
      
      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar Rota</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Copie o link abaixo para abrir a rota otimizada no Google Maps ou outro GPS.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Link
              </Label>
              <Input
                id="link"
                readOnly
                value={shareUrl}
                className="bg-zinc-800 border-zinc-700 text-xs h-9 focus-visible:ring-0"
              />
            </div>
            <Button 
              type="submit" 
              size="sm" 
              className="px-3 bg-blue-600 hover:bg-blue-500"
              onClick={copyToClipboard}
            >
              <span className="sr-only">Copiar</span>
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter className="sm:justify-start mt-4">
            <p className="text-[10px] text-zinc-500 italic">
              * O link contém o ponto de partida e todas as paradas na ordem otimizada.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Sidebar */}
      <div className="w-full md:w-96 border-r border-zinc-800 flex flex-col h-[60vh] md:h-full bg-zinc-900/50 shrink-0">
        <CardHeader className="border-b border-zinc-800 pb-4 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Navigation className="w-6 h-6 text-blue-500" />
              Otimizador de Rota
            </CardTitle>
            <p className="text-xs text-zinc-400">Otimize seu percurso com facilidade</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetRoute}
            title="Resetar tudo"
            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </CardHeader>

        <div className="flex-1 overflow-y-auto p-4 min-h-0 custom-scrollbar">
          <div className="space-y-6">
            {/* Start Point */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Ponto de Partida</Label>
              <AddressInput
                placeholder="Ex: Av. Paulista, 1000"
                value={startAddress}
                onChange={setStartAddress}
                icon={<MapPin className="w-4 h-4" />}
              />
            </div>

            <Separator className="bg-zinc-800" />

            {/* Stops */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Paradas</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addStop}
                  className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Nova parada
                </Button>
              </div>

              <Reorder.Group
                axis="y"
                values={stopAddresses}
                onReorder={setStopAddresses}
                className="space-y-3"
              >
                <AnimatePresence mode="popLayout">
                  {stopAddresses.map((address, index) => (
                    <Reorder.Item
                      key={index}
                      value={address}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-2 group items-start"
                    >
                      <div className="mt-2 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <AddressInput
                        placeholder={`Endereço da parada ${index + 1}`}
                        value={address}
                        onChange={(val) => updateStop(index, val)}
                        autoFocus={index === lastAddedIndex}
                        icon={
                          <div className="w-4 h-4 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-zinc-500 rounded-full">
                            {index + 1}
                          </div>
                        }
                      />
                      {stopAddresses.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStop(index)}
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 mt-1 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2"
              >
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {optimizedStops.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                    Resumo da Rota
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSummary(!showSummary)}
                    className="h-7 text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    {showSummary ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
                
                <AnimatePresence>
                  {showSummary && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-2"
                    >
                      {optimizedStops.map((stop, i) => (
                        <div key={i} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex justify-between items-center">
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-xs font-medium text-zinc-300 truncate">{stop.address}</p>
                            <p className="text-[10px] text-zinc-500">
                              {stop.distanceFromPrevious?.toFixed(1)} km da parada anterior
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-blue-400">{stop.estimatedArrivalTime}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">Chegada</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0 space-y-3">
          {optimizedStops.length > 0 && (
            <Button
              variant="outline"
              onClick={shareRoute}
              className="w-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold h-10"
            >
              <Share2 className="w-4 h-4 mr-2 text-green-500" />
              Compartilhar Rota
            </Button>
          )}
          <Button
            onClick={calculateRoute}
            disabled={isCalculating}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 shadow-lg shadow-blue-900/20"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Otimizando...
              </>
            ) : (
              "Otimizar rota"
            )}
          </Button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-zinc-950">
        <Map start={startLocation} stops={optimizedStops} />
        
        {/* Map Overlay Info */}
        {!startLocation && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm z-10 pointer-events-none">
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Pronto para começar?</h2>
              <p className="text-zinc-400 text-sm">
                Insira o ponto de partida e as paradas desejadas para visualizar sua rota otimizada no mapa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
