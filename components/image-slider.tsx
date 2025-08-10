"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SliderImage {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  order: number;
}

interface ImageSliderProps {
  images: SliderImage[];
  autoPlay?: boolean;
  interval?: number;
}

export default function ImageSlider({ 
  images, 
  autoPlay = true, 
  interval = 5000 
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const timer = setInterval(() => {
      if (isAutoPlaying) {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, images.length, isAutoPlaying]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      (prevIndex - 1 + images.length) % images.length
    );
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[500px] overflow-hidden rounded-xl shadow-2xl">
      {/* Main Image */}
      <div className="relative w-full h-full">
        <img
          src={images[currentIndex].imageUrl}
          alt={images[currentIndex].title || "Slider image"}
          className="w-full h-full object-cover transition-all duration-500 ease-in-out"
        />
        
        {/* Overlay with title and description */}
        {(images[currentIndex].title || images[currentIndex].description) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 sm:p-6 md:p-8">
            {images[currentIndex].title && (
              <h3 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-2">
                {images[currentIndex].title}
              </h3>
            )}
            {images[currentIndex].description && (
              <p className="text-white/90 text-sm sm:text-base md:text-lg">
                {images[currentIndex].description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <Button
            onClick={prevSlide}
            variant="outline"
            size="sm"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border-gray-300 text-gray-700 shadow-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={nextSlide}
            variant="outline"
            size="sm"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border-gray-300 text-gray-700 shadow-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none ${
                index === currentIndex
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      )}

      {/* Auto-play indicator */}
      {autoPlay && images.length > 1 && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-2 bg-black/50 rounded-full px-3 py-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isAutoPlaying ? "bg-green-400 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="text-white text-xs">
              {isAutoPlaying ? "Auto" : "Manuel"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 