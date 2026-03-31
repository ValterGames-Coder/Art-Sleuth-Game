export interface Zone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Fact {
  title: string;
  description: string;
  source: string;
}

export interface HiddenObject {
  id: string;
  name: string;
  zone: Zone;
  fact: Fact;
}

export interface PaintingInfo {
  title: string;
  artist: string;
  year: number;
  museum: string;
  description: string;
  image: string;
}

export interface GameData {
  painting: PaintingInfo;
  objects: HiddenObject[];
}
