import { prisma } from '../../../src/server/db/client';

const DEFAULT_ABOUT = {
  aboutTitle: 'Sobre a loja',
  aboutDescription: 'Aqui você encontra produtos digitais e físicos com entrega rápida e suporte dedicado.',
  aboutSection1Title: 'Nossa missão',
  aboutSection1Description: 'Oferecer uma experiência de compra simples, segura e transparente, com foco em qualidade e atendimento.',
  aboutSection2Title: 'Contato',
  aboutSection2Description: 'Em caso de dúvidas, fale com nosso time pelo canal de suporte.',
  aboutSection3Title: '',
  aboutSection3Description: '',
};

export default async function AboutPage() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'aboutTitle',
          'aboutDescription',
          'aboutSection1Title',
          'aboutSection1Description',
          'aboutSection2Title',
          'aboutSection2Description',
          'aboutSection3Title',
          'aboutSection3Description',
        ],
      },
    },
  });

  const about = { ...DEFAULT_ABOUT } as Record<string, string>;
  for (const setting of settings) {
    try {
      about[setting.key] = JSON.parse(setting.value);
    } catch {
      about[setting.key] = setting.value;
    }
  }

  const sections = [
    {
      title: about.aboutSection1Title,
      description: about.aboutSection1Description,
    },
    {
      title: about.aboutSection2Title,
      description: about.aboutSection2Description,
    },
    {
      title: about.aboutSection3Title,
      description: about.aboutSection3Description,
    },
  ].filter((section) => section.title || section.description);
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h1 className="h3 mb-3">{about.aboutTitle}</h1>
          <p className="text-muted">{about.aboutDescription}</p>
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {sections.length === 0 ? (
                <p className="mb-0 text-muted">Conteúdo não informado.</p>
              ) : (
                sections.map((section, index) => (
                  <div key={`${section.title}-${index}`} className={index === 0 ? '' : 'mt-4'}>
                    {section.title && <h2 className="h5 mb-3">{section.title}</h2>}
                    {section.description && <p className="mb-0">{section.description}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
