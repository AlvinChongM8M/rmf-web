import { Level } from 'api-client';
import React from 'react';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { Vector3 } from 'three';

export interface MapLocalEvents {
  disabledLayers: ReplaySubject<Record<string, boolean>>;
  zoom: BehaviorSubject<number | null>;
  cameraPosition: BehaviorSubject<Vector3 | null>;
  zoomIn: Subject<void>;
  zoomOut: Subject<void>;
  levelSelect: BehaviorSubject<Level | null>;
  resetCamera: Subject<[x: number, y: number, z: number, zoom: number]>;
}

export function createMapLocalEvents(): MapLocalEvents {
  return {
    disabledLayers: new ReplaySubject<Record<string, boolean>>(),
    zoom: new BehaviorSubject<number | null>(null),
    cameraPosition: new BehaviorSubject<Vector3 | null>(null),
    zoomIn: new Subject<void>(),
    zoomOut: new Subject<void>(),
    levelSelect: new BehaviorSubject<Level | null>(null),
    resetCamera: new Subject<[x: number, y: number, z: number, zoom: number]>(),
  };
}

export const MapEventsContext = React.createContext<MapLocalEvents>(createMapLocalEvents());

export function useMapEvents(): MapLocalEvents {
  return React.useContext(MapEventsContext);
}

export function MapEventsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { current: events } = React.useRef<MapLocalEvents>(createMapLocalEvents());
  return <MapEventsContext.Provider value={events}>{children}</MapEventsContext.Provider>;
}
