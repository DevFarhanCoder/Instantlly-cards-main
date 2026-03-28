import React, { createContext, useContext, useMemo, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { cn } from "../../lib/utils";

type CarouselContextValue = {
  scrollRef: React.RefObject<ScrollView | null>;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

export const Carousel = ({ children }: { children: React.ReactNode }) => {
  const scrollRef = useRef<ScrollView | null>(null);
  const value = useMemo(() => ({ scrollRef }), []);
  return <CarouselContext.Provider value={value}>{children}</CarouselContext.Provider>;
};

export const CarouselContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(CarouselContext);
  return (
    <ScrollView
      ref={ctx?.scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn("flex-row", className)}
    >
      <View className="flex-row">{children}</View>
    </ScrollView>
  );
};

export const CarouselItem = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <View className={cn("mr-3", className)}>{children}</View>;

export const CarouselPrevious = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children?: React.ReactNode;
}) => (
  <Pressable onPress={onPress} className={cn("p-2", className)}>
    {children}
  </Pressable>
);

export const CarouselNext = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children?: React.ReactNode;
}) => (
  <Pressable onPress={onPress} className={cn("p-2", className)}>
    {children}
  </Pressable>
);
