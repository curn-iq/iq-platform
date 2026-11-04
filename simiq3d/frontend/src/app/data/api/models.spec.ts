import type {
  ChatAction as DomainChatAction,
  ChatReply as DomainChatReply,
  ChatRequest as DomainChatRequest,
  ChatStreamEvent as DomainChatStreamEvent,
  ChatTurn as DomainChatTurn,
  ClinicalField as DomainClinicalField,
} from '../../domain/chat';
import type {
  ChatAction,
  ChatReply,
  ChatRequest,
  ChatStreamEvent,
  ChatTurn,
  ClinicalField,
} from './models';

// La comprobación es de tipos: si el backend de SIMIQ3D agrega o quita una
// acción del chat y se regeneró simiq3d.d.ts, esta prueba deja de compilar hasta
// que el visor la tenga en cuenta (`sceneFor`).
describe('tipos generados de la API', () => {
  // `domain/` no importa la API, así que declara sus propios tipos; aquí, que
  // sí puede ver ambos lados, se comprueba que coinciden.
  it('coinciden con los tipos de domain/', () => {
    expectTypeOf<ChatAction>().toEqualTypeOf<DomainChatAction>();
    expectTypeOf<ClinicalField>().toEqualTypeOf<DomainClinicalField>();
    expectTypeOf<ChatReply>().toEqualTypeOf<DomainChatReply>();
    expectTypeOf<ChatRequest>().toEqualTypeOf<DomainChatRequest>();
    expectTypeOf<ChatTurn>().toEqualTypeOf<DomainChatTurn>();
    expectTypeOf<ChatStreamEvent>().toEqualTypeOf<DomainChatStreamEvent>();
  });
});
