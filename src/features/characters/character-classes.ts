export const characterClasses = [
  { value: 4252, label: "Cavaleiro Draconiano" },
  { value: 4253, label: "Engenheiro" },
  { value: 4254, label: "Executor" },
  { value: 4255, label: "Magus" },
  { value: 4256, label: "Cardeal" },
  { value: 4257, label: "Falcão dos Ventos" },
  { value: 4258, label: "Guardião Imperial" },
  { value: 4259, label: "Cientista" },
  { value: 4260, label: "Mandraque" },
  { value: 4261, label: "Elementalista" },
  { value: 4262, label: "Inquisidor" },
  { value: 4263, label: "Maestro" },
  { value: 4264, label: "Diva" },
] as const;

export type CharacterClassOption = (typeof characterClasses)[number];
export type CharacterClassId = CharacterClassOption["value"];

const characterClassMap = new Map<number, string>(
  characterClasses.map((characterClass) => [characterClass.value, characterClass.label]),
);

export function isCharacterClassId(value: number): value is CharacterClassId {
  return characterClassMap.has(value);
}

export function getCharacterClassLabel(classId: number) {
  return characterClassMap.get(classId) ?? "Classe desconhecida";
}
