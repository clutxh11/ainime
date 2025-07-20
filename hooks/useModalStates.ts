import { useState } from "react";
import type { ModalStates } from "@/types";

export interface ExtendedModalStates extends ModalStates {
  isViewTeamsModalOpen?: boolean;
  isCreateTeamModalOpen?: boolean;
  isTeamDetailModalOpen?: boolean;
}

export function useModalStates(
  initialState: Partial<ExtendedModalStates> = {}
) {
  const [modalStates, setModalStates] = useState<ExtendedModalStates>({
    isProfileModalOpen: false,
    isSettingsModalOpen: false,
    isContributionsModalOpen: false,
    isViewTeamsModalOpen: false,
    isCreateTeamModalOpen: false,
    isTeamDetailModalOpen: false,
    ...initialState,
  });

  const openModal = (modalName: keyof ExtendedModalStates) => {
    setModalStates((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName: keyof ExtendedModalStates) => {
    setModalStates((prev) => ({ ...prev, [modalName]: false }));
  };

  const closeAllModals = () => {
    setModalStates((prev) =>
      Object.keys(prev).reduce((acc, key) => {
        acc[key as keyof ExtendedModalStates] = false;
        return acc;
      }, {} as ExtendedModalStates)
    );
  };

  return {
    modalStates,
    openModal,
    closeModal,
    closeAllModals,
  };
}
