import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Group {
  title: string;
  open?: true;
  questions: readonly { question: string; answer: string }[];
}

// Los textos son los de `diseno/mockups/inicio.html`.
const GROUPS: readonly Group[] = [
  {
    title: 'Cuenta',
    open: true,
    questions: [
      { question: '¿Cuánto cuesta?', answer: 'Nada. La cuenta es gratuita.' },
      {
        question: '¿Sirve si estudio en otra universidad?',
        answer: 'Sí. Cualquier estudiante puede crear su cuenta.',
      },
      {
        question: '¿Qué puedo ver sin cuenta?',
        answer:
          'El catálogo de técnicas. Para abrir una técnica y usar SIMIQ3D y SIVRI se crea una cuenta.',
      },
    ],
  },
  {
    title: 'Técnicas',
    questions: [
      {
        question: '¿Las técnicas son confiables?',
        answer:
          'Sí. Cada técnica está validada por docentes y estudiantes de Instrumentación Quirúrgica.',
      },
      {
        question: '¿Incluyen la mesa de reserva?',
        answer: 'Sí, junto con la mesa de Mayo, en las técnicas que la utilizan.',
      },
    ],
  },
  {
    title: 'Herramientas',
    questions: [
      {
        question: '¿Por cuál herramienta empiezo?',
        answer: 'Por la que se prefiera. Las tres usan las mismas técnicas.',
      },
      { question: '¿Qué necesito para usar SIVRI?', answer: 'Una cámara que vea la mesa armada.' },
      { question: '¿Funciona en el celular?', answer: 'Sí, en computador y en celular.' },
    ],
  },
];

/**
 * «Preguntas frecuentes.» (id `preguntas`): tres grupos expandibles (Cuenta,
 * Técnicas, Herramientas), cada uno con sus preguntas, en las columnas 7-12. Son
 * `<details>`: se abren con el teclado y sin JavaScript. A esta sección llevan
 * «Preguntas frecuentes» de la barra y del pie. Ver «Titular Lateral» en
 * `DESIGN.md`.
 */
@Component({
  selector: 'app-home-faq',
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeFaq {
  protected readonly groups = GROUPS;
}
