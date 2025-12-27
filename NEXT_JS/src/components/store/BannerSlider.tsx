'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  buttonText: string | null;
}

interface BannerSliderProps {
  banners: Banner[];
}

export default function BannerSlider({ banners }: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play do slider
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Troca a cada 5 segundos

    return () => clearInterval(interval);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  // Se não há banners, mostra placeholder
  if (banners.length === 0) {
    return (
      <section
        className="bg-dark text-white py-5"
        style={{
          minHeight: 400,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div className="container">
          <div className="row align-items-center" style={{ minHeight: 300 }}>
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold mb-3">Bem-vindo à NoBugs Store</h1>
              <p className="lead mb-4">
                Descubra nossos produtos digitais e físicos. Qualidade garantida e entrega rápida.
              </p>
              <Link href="/products" className="btn btn-light btn-lg">
                <i className="bi bi-bag me-2"></i>
                Ver Produtos
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="position-relative" style={{ minHeight: 400 }}>
      {/* Slides */}
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`banner-slide ${index === currentIndex ? 'active' : ''}`}
          style={{
            position: index === currentIndex ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            opacity: index === currentIndex ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            minHeight: 400,
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${banner.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="container h-100">
            <div
              className="row align-items-center text-white"
              style={{ minHeight: 400 }}
            >
              <div className="col-lg-8">
                <h1 className="display-5 fw-bold mb-3">{banner.title}</h1>
                {banner.subtitle && (
                  <p className="lead mb-4">{banner.subtitle}</p>
                )}
                {banner.linkUrl && (
                  <Link
                    href={banner.linkUrl}
                    className="btn btn-light btn-lg"
                  >
                    {banner.buttonText || 'Saiba mais'}
                    <i className="bi bi-arrow-right ms-2"></i>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Controles de navegação */}
      {banners.length > 1 && (
        <>
          {/* Setas */}
          <button
            onClick={goPrev}
            className="btn btn-light position-absolute top-50 start-0 translate-middle-y ms-3 rounded-circle"
            style={{ width: 48, height: 48, zIndex: 10 }}
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <button
            onClick={goNext}
            className="btn btn-light position-absolute top-50 end-0 translate-middle-y me-3 rounded-circle"
            style={{ width: 48, height: 48, zIndex: 10 }}
          >
            <i className="bi bi-chevron-right"></i>
          </button>

          {/* Indicadores */}
          <div
            className="position-absolute bottom-0 start-50 translate-middle-x mb-4"
            style={{ zIndex: 10 }}
          >
            <div className="d-flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`btn rounded-circle p-0 ${
                    index === currentIndex ? 'btn-light' : 'btn-outline-light'
                  }`}
                  style={{
                    width: 12,
                    height: 12,
                    opacity: index === currentIndex ? 1 : 0.6,
                  }}
                ></button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
