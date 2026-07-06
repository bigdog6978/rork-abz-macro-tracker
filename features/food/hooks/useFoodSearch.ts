/**
 * Search state for the Add Food screen: debounced USDA/local suggestions plus
 * the parallel voice-resolver "best match" for typed quantity+unit input.
 * Logic moved verbatim from app/add-food.tsx; owns only search-domain state.
 */

import { useCallback, useRef, useState } from 'react';
import type { UnitId, UnitKind } from '../../../src/lib/units';
import type { NormalizedFood } from '../types';
import * as foodService from '../foodService';
import { parseTextInput } from '../inputParser';
import { resolveVoiceItem, type VoiceResolvedItem } from '../voiceResolver';

const DEBOUNCE_MS = 300;

export type ParsedInput = {
  quantity: number;
  unitId: UnitId;
  unitKind: UnitKind;
  foodQuery: string;
};

export type SearchStatus = 'idle' | 'loading' | 'error' | 'rate_limited';

export function useFoodSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NormalizedFood[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [searchErrorCode, setSearchErrorCode] = useState<string | undefined>();
  const [searchErrorDetail, setSearchErrorDetail] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [parsedInput, setParsedInput] = useState<ParsedInput | null>(null);
  const [textResolvedItem, setTextResolvedItem] = useState<VoiceResolvedItem | null>(null);
  const [isResolvingText, setIsResolvingText] = useState(false);
  const [showOtherResults, setShowOtherResults] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveRequestIdRef = useRef(0);
  // Ref mirrors parsedInput state for synchronous reads inside callbacks
  const parsedInputRef = useRef<ParsedInput | null>(null);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setShowSuggestions(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!text.trim()) {
        parsedInputRef.current = null;
        setParsedInput(null);
        setTextResolvedItem(null);
        setIsResolvingText(false);
        setShowOtherResults(false);
        setSuggestions([]);
        setSearchStatus('idle');
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchStatus('loading');
      const parsed = parseTextInput(text);
      const nextParsed =
        parsed.quantity != null && parsed.unitId != null && parsed.unitKind != null
          ? { quantity: parsed.quantity, unitId: parsed.unitId, unitKind: parsed.unitKind, foodQuery: parsed.foodQuery }
          : null;
      parsedInputRef.current = nextParsed;
      setParsedInput(nextParsed);

      // When a quantity+unit is parsed, run the voice resolver in parallel for a clean top pick
      if (nextParsed) {
        const requestId = ++resolveRequestIdRef.current;
        setTextResolvedItem(null);
        setIsResolvingText(true);
        setShowOtherResults(false);
        resolveVoiceItem({
          label: text.trim(),
          query: nextParsed.foodQuery,
          quantity: nextParsed.quantity,
          unitId: nextParsed.unitId,
          unitKind: nextParsed.unitKind,
          ambiguousOunces: false,
        }).then((result) => {
          if (resolveRequestIdRef.current !== requestId) return;
          setIsResolvingText(false);
          if (result.status === 'resolved') {
            setTextResolvedItem(result.item);
          } else {
            setTextResolvedItem(null);
          }
        }).catch(() => {
          if (resolveRequestIdRef.current !== requestId) return;
          setIsResolvingText(false);
          setTextResolvedItem(null);
        });
      } else {
        setTextResolvedItem(null);
        setIsResolvingText(false);
        setShowOtherResults(true);
      }

      const searchQuery = parsed.foodQuery || text.trim();
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await foodService.searchSuggestions(searchQuery);
          if (result.status === 'ok') {
            setSuggestions(result.results);
            setSearchStatus('idle');
            setSearchErrorCode(undefined);
            setSearchErrorDetail(undefined);
          } else if (result.status === 'empty') {
            setSuggestions([]);
            setSearchStatus('idle');
            setSearchErrorCode(undefined);
            setSearchErrorDetail(undefined);
          } else if (result.status === 'rate_limited') {
            setSuggestions([]);
            setSearchStatus('rate_limited');
            setSearchErrorCode(undefined);
            setSearchErrorDetail(undefined);
          } else {
            setSuggestions([]);
            setSearchStatus('error');
            setSearchErrorCode(result.status === 'error' ? result.errorCode : undefined);
            setSearchErrorDetail(result.status === 'error' ? result.errorDetail : undefined);
          }
        } catch {
          setSuggestions([]);
          setSearchStatus('error');
          setSearchErrorCode('UNKNOWN');
          setSearchErrorDetail(undefined);
        } finally {
          setIsSearching(false);
        }
      }, DEBOUNCE_MS);
    },
    []
  );

  return {
    query,
    setQuery,
    suggestions,
    setSuggestions,
    searchStatus,
    setSearchStatus,
    searchErrorCode,
    searchErrorDetail,
    isSearching,
    setIsSearching,
    showSuggestions,
    setShowSuggestions,
    parsedInput,
    setParsedInput,
    textResolvedItem,
    setTextResolvedItem,
    isResolvingText,
    setIsResolvingText,
    showOtherResults,
    setShowOtherResults,
    parsedInputRef,
    resolveRequestIdRef,
    handleSearch,
  };
}
