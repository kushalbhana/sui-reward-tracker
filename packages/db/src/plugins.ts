import mongoose from "mongoose";

// Import the auto increment plugin in a way that respects TS and native CommonJS resolution
// @ts-ignore
import Inc from "mongoose-sequence";

export const AutoIncrement = Inc(mongoose as any);
