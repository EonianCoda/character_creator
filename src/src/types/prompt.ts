export interface ParsedTag {
  raw: string;        // The original segment from the prompt, e.g., "(masterpiece:1.2)"
  text: string;       // The core tag text, e.g., "masterpiece"
  weight?: number;    // The numerical weight, e.g., 1.2
  bracketType?: '(' | '[' | '{' | '<' | null; // The type of bracket used
  isLora?: boolean;   // Flag for Lora syntax
}
