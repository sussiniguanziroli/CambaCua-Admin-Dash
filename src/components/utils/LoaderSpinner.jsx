import React from 'react';


/**
 * Un componente simple de spinner de carga CSS.
 * @param {object} props
 * @param {string} [props.size] - Tamaño del spinner ('small', 'medium', 'large'). Default: 'medium'.
 * @param {string} [props.className] - Clases CSS adicionales.
 */
const LoaderSpinner = ({ size = 'medium', className = '' }) => {
    return (
        <div className={`loader-spinner loader-spinner--${size} ${className}`}></div>
    );
};

export default LoaderSpinner;