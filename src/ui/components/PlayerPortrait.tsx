/** Retrato de um assento na mesa: a foto da conta Google (salas) ou o selo de seatPortrait. */
import { isGooglePhoto, type SeatSetup } from '../../session';
import { GOOGLE_AVATAR } from '../../state/profile';
import styles from './Avatar.module.css';
import { portraitOf, portraitStyle } from './seatPortrait';

export function PlayerPortrait({
  seat,
  name,
  className,
}: {
  seat: SeatSetup | undefined;
  name: string;
  className?: string;
}) {
  const photo = seat?.kind === 'human' && seat.avatar === GOOGLE_AVATAR ? seat.photoURL : null;
  return (
    <span className={className} style={portraitStyle(seat, name)} aria-hidden="true">
      {isGooglePhoto(photo) ? (
        <img
          className={styles.seatPhoto}
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
        />
      ) : (
        portraitOf(seat, name).glyph
      )}
    </span>
  );
}
