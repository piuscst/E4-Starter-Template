import Phaser from "phaser";
import { loadSounds } from "../sounds.ts";
import { makeTextures } from "../textures.ts";

/** Shared assets are created once before the first title screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    if (!this.textures.exists("player")) {
      makeTextures(this);
      loadSounds(this);
    }
    this.scene.start("title");
  }
}
