import { createContext, useContext } from "react";

export const ApiStatusContext = createContext(true);

export function useApiOnline() {
  return useContext(ApiStatusContext);
}
